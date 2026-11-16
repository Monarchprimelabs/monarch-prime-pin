import { FREE_ACTIVE_PLANS } from './featureGate';
import type { FounderStatus } from './founderRules';

// Free users get 2 active protocols, with reminders and the Today plan.
// Ended protocols don't count: ending one frees a slot. Editing never blocks.
export const FREE_PROTOCOL_LIMIT = FREE_ACTIVE_PLANS;

/**
 * Entries a new free user can save. Premium and every founder (anyone who
 * used 1.x) log without a limit, as 2.0 promised them. Records already saved
 * always stay viewable, editable and exportable; only new entries stop.
 */
export const FREE_LOG_LIMIT = 30;

export function logsUnlimited(who: { premium: boolean; founder: FounderStatus }): boolean {
  return who.premium || who.founder === 'freeFounder' || who.founder === 'paidFounder';
}

/** Free entries left for this user, or null when there is no limit. */
export function freeLogsLeft(saved: number, who: { premium: boolean; founder: FounderStatus }): number | null {
  if (logsUnlimited(who)) return null;
  return Math.max(0, FREE_LOG_LIMIT - saved);
}

export function canStartProtocol(activeCount: number, unlimited: boolean): boolean {
  return unlimited || activeCount < FREE_PROTOCOL_LIMIT;
}
