import { DAILY_CAP, NotifyPrefs } from './prefs';
import { localDateISO } from '../dates';

// Pure planning for the non-plan notifications: which ones, when, inside the
// user's quiet hours and the daily cap. Neutral text keys only, no amounts,
// no vendor names. Unit-tested in src/lib/__tests__/notifyPlan.test.ts.

export type ExtraKind = 'trialEnding' | 'planFollowUp' | 'restock' | 'weeklySummary' | 'monthlyReport' | 'photoCheckin';

export type ExtraNotification = {
  id: string;
  kind: ExtraKind;
  fireAt: Date;
  titleKey: string;
  bodyKey: string;
  vars?: Record<string, string | number>;
};

/** Higher first when the daily cap has to drop something. */
const PRIORITY: ExtraKind[] = ['trialEnding', 'planFollowUp', 'restock', 'weeklySummary', 'monthlyReport', 'photoCheckin'];

export const HORIZON_DAYS = 14;

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** True when a time falls inside quiet hours (which may wrap past midnight). */
export function inQuietHours(date: Date, prefs: Pick<NotifyPrefs, 'quietStart' | 'quietEnd'>): boolean {
  const t = date.getHours() * 60 + date.getMinutes();
  const start = minutes(prefs.quietStart);
  const end = minutes(prefs.quietEnd);
  if (start === end) return false;
  return start < end ? t >= start && t < end : t >= start || t < end;
}

/** Moves a time out of quiet hours to the moment they end. */
export function outsideQuietHours(date: Date, prefs: Pick<NotifyPrefs, 'quietStart' | 'quietEnd'>): Date {
  if (!inQuietHours(date, prefs)) return date;
  const end = minutes(prefs.quietEnd);
  const moved = new Date(date);
  moved.setHours(Math.floor(end / 60), end % 60, 0, 0);
  if (moved.getTime() <= date.getTime()) moved.setDate(moved.getDate() + 1);
  return moved;
}

const at = (day: Date, hhmm: string) => {
  const d = new Date(day);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

export type PlanInput = {
  prefs: NotifyPrefs;
  now: Date;
  premium: boolean;
  /** Local days (YYYY-MM-DD) in the horizon with a planned entry not yet logged or skipped. */
  unloggedPlanDays: string[];
  /** Vial restock dates the user set (YYYY-MM-DD). Text never names the vial: lock screens are visible to others. */
  restocks: { vialId: string; date: string }[];
  /** When the annual trial ends, if the user started one here. */
  trialEndsAt: Date | null;
  /** The day photo check-ins count from (when the user turned them on). */
  photoAnchor: string;
};

export function planExtraNotifications(input: PlanInput): ExtraNotification[] {
  const { prefs, now } = input;
  const all: ExtraNotification[] = [];
  const end = new Date(now);
  end.setDate(end.getDate() + HORIZON_DAYS);

  for (let i = 0; i < HORIZON_DAYS; i += 1) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const iso = localDateISO(day);

    if (prefs.planFollowUp && input.unloggedPlanDays.includes(iso)) {
      all.push({ id: `followup-${iso}`, kind: 'planFollowUp', fireAt: at(day, '20:00'), titleKey: 'notify.followUpTitle', bodyKey: 'notify.followUpBody' });
    }
    if (prefs.weeklySummary && day.getDay() === 0) {
      all.push({ id: `weekly-${iso}`, kind: 'weeklySummary', fireAt: at(day, '18:00'), titleKey: 'notify.weeklyTitle', bodyKey: input.premium ? 'notify.weeklyBodyPremium' : 'notify.weeklyBody' });
    }
    if (prefs.monthlyReport && input.premium && day.getDate() === 1) {
      all.push({ id: `monthly-${iso}`, kind: 'monthlyReport', fireAt: at(day, '09:00'), titleKey: 'notify.monthlyTitle', bodyKey: 'notify.monthlyBody' });
    }
    if (prefs.photoCheckin !== 'off') {
      const anchor = new Date(`${input.photoAnchor}T12:00:00`);
      const diff = Math.round((new Date(`${iso}T12:00:00`).getTime() - anchor.getTime()) / 86400000);
      const due = prefs.photoCheckin === 'monthly'
        ? day.getDate() === anchor.getDate() && diff > 0
        : diff > 0 && diff % (prefs.photoCheckin === 'weekly' ? 7 : 14) === 0;
      if (due) all.push({ id: `photo-${iso}`, kind: 'photoCheckin', fireAt: at(day, '10:00'), titleKey: 'notify.photoTitle', bodyKey: 'notify.photoBody' });
    }
  }

  if (prefs.restock) {
    for (const restock of input.restocks) {
      all.push({
        id: `restock-${restock.vialId}-${restock.date}`, kind: 'restock', fireAt: at(new Date(`${restock.date}T12:00:00`), '10:00'),
        titleKey: 'notify.restockTitle', bodyKey: 'notify.restockBody',
      });
    }
  }

  if (prefs.trialEnding && input.trialEndsAt) {
    const fire = new Date(input.trialEndsAt);
    fire.setDate(fire.getDate() - 2);
    fire.setHours(10, 0, 0, 0);
    all.push({
      id: 'trial-ending', kind: 'trialEnding', fireAt: fire, titleKey: 'notify.trialTitle', bodyKey: 'notify.trialBody',
      vars: { date: localDateISO(input.trialEndsAt) },
    });
  }

  const shifted = all
    .map(n => ({ ...n, fireAt: outsideQuietHours(n.fireAt, prefs) }))
    .filter(n => n.fireAt.getTime() > now.getTime() && n.fireAt.getTime() <= end.getTime());

  // Daily cap: keep the highest-priority ones on each day.
  const byDay = new Map<string, ExtraNotification[]>();
  for (const n of shifted) {
    const key = localDateISO(n.fireAt);
    byDay.set(key, [...(byDay.get(key) ?? []), n]);
  }
  const kept: ExtraNotification[] = [];
  for (const list of byDay.values()) {
    list.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
    kept.push(...list.slice(0, DAILY_CAP));
  }
  return kept.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
