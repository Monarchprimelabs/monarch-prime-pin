// Free users get one active protocol, with its reminders and the Today plan,
// so they see the daily loop work before deciding on Lifetime Pro. Ended
// protocols don't count: ending one frees the slot. Editing never blocks.
export const FREE_PROTOCOL_LIMIT = 1;

export function canStartProtocol(activeCount: number, canUsePro: boolean): boolean {
  return canUsePro || activeCount < FREE_PROTOCOL_LIMIT;
}
