import { daysBetween } from '../schedule/days';
import { occurrencesBetween } from '../schedule/engine';
import { addDays } from '../schedule/days';
import { DoseSkip, DoseUnit, Occurrence, Protocol } from '../schedule/types';
import { Vial, VialAmountUnit } from './types';

export const LOW_SUPPLY_DAYS = 7;
const PROJECTION_DAYS = 400;

type DrawRecord = { dose: string; unit: DoseUnit; vialId?: string; occurrenceKey?: string };

const parseAmount = (value: string) => Number(String(value).replace(',', '.'));

export function toVialTotal(amount: number, unit: VialAmountUnit): { total: number; base: 'mcg' | 'IU' } {
  if (unit === 'IU') return { total: amount, base: 'IU' };
  return { total: unit === 'mg' ? amount * 1000 : amount, base: 'mcg' };
}

/** Concentration per mL in the vial's base unit (mcg/mL or IU/mL). */
export function concentration(vial: Pick<Vial, 'total' | 'diluentMl'>): number {
  return vial.diluentMl > 0 ? vial.total / vial.diluentMl : 0;
}

/**
 * A dose in the vial's base unit, or null when the units can't be related:
 * mass doses need a mass vial, IU doses an IU vial, and mL converts through
 * the vial's concentration.
 */
export function doseInVialBase(amount: string, unit: DoseUnit, vial: Pick<Vial, 'base' | 'total' | 'diluentMl'>): number | null {
  const n = parseAmount(amount);
  if (!Number.isFinite(n) || n <= 0) return null;
  switch (unit) {
    case 'mcg': return vial.base === 'mcg' ? n : null;
    case 'mg': return vial.base === 'mcg' ? n * 1000 : null;
    case 'IU': return vial.base === 'IU' ? n : null;
    case 'mL': return vial.diluentMl > 0 ? n * concentration(vial) : null;
  }
}

export type VialUsage = { used: number; remaining: number; unconverted: number };

/** What logged records have drawn from a vial. */
export function vialUsage(vial: Vial, records: DrawRecord[]): VialUsage {
  let used = 0;
  let unconverted = 0;
  for (const record of records) {
    if (record.vialId !== vial.id) continue;
    const draw = doseInVialBase(record.dose, record.unit, vial);
    if (draw === null) unconverted += 1;
    else used += draw;
  }
  return { used, remaining: Math.max(0, vial.total - used), unconverted };
}

export type VialProjection = {
  remaining: number;
  /** First planned dose the remaining amount can't fully cover. */
  firstShort?: Occurrence;
  /** Whole days from today to firstShort's day. */
  daysLeft?: number;
  /** Planned doses on this vial whose unit can't be related to it. */
  unconvertedPlans: number;
  status: 'ok' | 'low' | 'empty' | 'expired' | 'noPlan';
};

/**
 * Walk every protocol drawing from the vial in time order, from today, and
 * find the first planned dose the vial can't cover. Doses already logged
 * were counted in `remaining`; skipped ones draw nothing.
 */
export function projectVial(
  vial: Vial,
  protocols: Protocol[],
  records: DrawRecord[],
  skips: DoseSkip[],
  today: string,
): VialProjection {
  const { remaining } = vialUsage(vial, records);
  const expired = !!vial.expiresAt && vial.expiresAt < today;
  if (vial.status === 'empty' || remaining <= 0) return { remaining, unconvertedPlans: 0, status: 'empty' };

  const drawing = protocols.filter(p => p.status === 'active' && p.vialId === vial.id);
  const done = new Set(records.map(r => r.occurrenceKey).filter((k): k is string => !!k));
  const skipped = new Set(skips.map(s => s.occurrenceKey));
  let left = remaining;
  let unconvertedPlans = 0;
  let firstShort: Occurrence | undefined;
  for (const occurrence of occurrencesBetween(drawing, today, addDays(today, PROJECTION_DAYS))) {
    if (done.has(occurrence.key) || skipped.has(occurrence.key)) continue;
    const draw = doseInVialBase(occurrence.amount, occurrence.unit, vial);
    if (draw === null) { unconvertedPlans += 1; continue; }
    // A tiny tolerance keeps float sums (0.1 + 0.2) from flagging an exact fit.
    if (draw > left + 1e-9) { firstShort = occurrence; break; }
    left -= draw;
  }

  const daysLeft = firstShort ? daysBetween(today, firstShort.date) : undefined;
  const status = expired ? 'expired'
    : drawing.length === 0 ? 'noPlan'
      : daysLeft !== undefined && daysLeft <= LOW_SUPPLY_DAYS ? 'low' : 'ok';
  return { remaining, firstShort, daysLeft, unconvertedPlans, status };
}

/** "2.5 mg" / "250 mcg" / "40 IU" for a base amount. */
export function formatVialAmount(amount: number, base: 'mcg' | 'IU'): string {
  const round = (n: number) => String(Math.round(n * 100) / 100);
  if (base === 'IU') return `${round(amount)} IU`;
  return amount >= 1000 ? `${round(amount / 1000)} mg` : `${round(amount)} mcg`;
}
