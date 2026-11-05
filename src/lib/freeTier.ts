import { FREE_ACTIVE_PLANS } from './featureGate';

// Free users get 2 active protocols, with reminders and the Today plan.
// Ended protocols don't count: ending one frees a slot. Editing never blocks.
export const FREE_PROTOCOL_LIMIT = FREE_ACTIVE_PLANS;

export function canStartProtocol(activeCount: number, unlimited: boolean): boolean {
  return unlimited || activeCount < FREE_PROTOCOL_LIMIT;
}
