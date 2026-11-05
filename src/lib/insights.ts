import type { Injection } from '../data/peptides';
import type { DoseSkip, Protocol } from './schedule/types';
import type { Vial } from './vials/types';
import { addDays } from './schedule/days';
import { occurrencesBetween } from './schedule/engine';
import { withStatus } from './schedule/status';
import { doseInVialBase, vialUsage } from './vials/math';
import { getInjectionSiteIds } from './sites';

// Insights (Premium): deterministic facts about the user's own entries.
// Counts, site usage, plan follow-through, what's left in a vial, and Health
// comparisons. Never a recommendation about amounts, timing, stacking or
// outcomes; src/lib/__tests__/insights.test.ts fails on advice words.

type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type Insight = { id: string; text: string };

export type InsightInput = {
  injections: Injection[];
  protocols: Protocol[];
  skips: DoseSkip[];
  vials: Vial[];
  today: string;
  /** Optional Apple Health sleep hours per local day (expanded Health). */
  sleepByDay?: Record<string, number>;
  monthLabel: string;
};

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86400000);

export function generateInsights(input: InsightInput, t: TFn): Insight[] {
  const { injections, today } = input;
  const out: Insight[] = [];
  const month = today.slice(0, 7);

  // 1. This month's entries.
  const monthRecords = injections.filter(r => r.date.startsWith(month));
  if (monthRecords.length > 0) {
    const compounds = new Set(monthRecords.map(r => r.peptide)).size;
    out.push({ id: 'month', text: t('insight.month', { n: monthRecords.length, c: compounds, month: input.monthLabel }) });
  }

  // 2. Most-used site in the last 14 days.
  const since14 = addDays(today, -13);
  const counts: Record<string, number> = {};
  injections.filter(r => r.date >= since14 && r.date <= today)
    .forEach(r => getInjectionSiteIds(r).forEach(id => { counts[id] = (counts[id] ?? 0) + 1; }));
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (top) out.push({ id: 'siteTop', text: t('insight.siteTop', { site: t('zone.' + top[0]), n: top[1] }) });

  // 3. A site used before that hasn't been logged in 21+ days (a fact, not a suggestion).
  const last: Record<string, string> = {};
  injections.forEach(r => getInjectionSiteIds(r).forEach(id => { if (!last[id] || r.date > last[id]) last[id] = r.date; }));
  const idle = Object.entries(last)
    .map(([id, date]) => ({ id, days: daysBetween(date, today) }))
    .filter(e => e.days >= 21)
    .sort((a, b) => b.days - a.days)[0];
  if (idle) out.push({ id: 'siteIdle', text: t('insight.siteIdle', { site: t('zone.' + idle.id), d: idle.days }) });

  // 4. Plan follow-through over the last 7 days.
  const views = withStatus(occurrencesBetween(input.protocols, addDays(today, -6), today), injections, input.skips, today)
    .filter(v => v.date < today || v.status !== 'planned');
  if (views.length > 0) {
    const logged = views.filter(v => v.status === 'logged').length;
    out.push({ id: 'plan', text: t('insight.plan', { logged, planned: views.length }) });
  }

  // 5. Vials: entries left at the amounts recorded from them.
  for (const vial of input.vials.filter(v => v.status !== 'empty')) {
    const draws = injections
      .filter(r => r.vialId === vial.id)
      .sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`))
      .map(r => doseInVialBase(r.dose, r.unit as never, vial))
      .filter((d): d is number => d !== null && d > 0);
    if (draws.length === 0) continue;
    const { remaining } = vialUsage(vial, injections);
    const left = Math.floor(remaining / draws[0] + 1e-9);
    out.push({ id: `vial-${vial.id}`, text: t('insight.vial', { vial: vial.label, n: Math.max(0, left) }) });
  }

  // 6. Sleep on days with entries vs without (last 30 days, both sides needed).
  if (input.sleepByDay) {
    const since30 = addDays(today, -29);
    const entryDays = new Set(injections.map(r => r.date));
    const withE: number[] = [];
    const without: number[] = [];
    Object.entries(input.sleepByDay).forEach(([day, hours]) => {
      if (day < since30 || day > today) return;
      (entryDays.has(day) ? withE : without).push(hours);
    });
    const avg = (list: number[]) => Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10;
    if (withE.length >= 3 && without.length >= 3) {
      out.push({ id: 'sleep', text: t('insight.sleep', { a: avg(withE), b: avg(without) }) });
    }
  }

  return out;
}
