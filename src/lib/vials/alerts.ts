import { addDays, localDay, localInstant } from '../schedule/days';
import { DoseSkip, Protocol } from '../schedule/types';
import { LOW_SUPPLY_DAYS, projectVial } from './math';
import { Vial } from './types';

export const VIAL_ALERT_TIME = '09:00';

export type VialAlert = { id: string; vialId: string; kind: 'week' | 'short'; shortDate: string; fireAt: Date };

/**
 * Up to two alerts per vial, both at 09:00 local: one LOW_SUPPLY_DAYS before
 * the first planned dose the vial can't cover, and one the day before it.
 * Past times are dropped; a fresh projection on every sync moves them.
 */
export function planVialAlerts(
  vials: Vial[],
  protocols: Protocol[],
  records: Parameters<typeof projectVial>[2],
  skips: DoseSkip[],
  now: Date,
): VialAlert[] {
  const today = localDay(now);
  const alerts: VialAlert[] = [];
  for (const vial of vials) {
    if (vial.status !== 'active') continue;
    const projection = projectVial(vial, protocols, records, skips, today);
    const short = projection.firstShort;
    if (!short) continue;
    const candidates: { kind: VialAlert['kind']; day: string }[] = [
      { kind: 'week', day: addDays(short.date, -LOW_SUPPLY_DAYS) },
      { kind: 'short', day: addDays(short.date, -1) },
    ];
    for (const { kind, day } of candidates) {
      const fireAt = localInstant(day, VIAL_ALERT_TIME);
      if (fireAt.getTime() <= now.getTime()) continue;
      alerts.push({ id: `mpp-vial|${vial.id}|${kind}`, vialId: vial.id, kind, shortDate: short.date, fireAt });
    }
  }
  return alerts.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
}
