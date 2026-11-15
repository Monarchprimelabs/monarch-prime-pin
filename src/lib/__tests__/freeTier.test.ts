import { canStartProtocol, FREE_PROTOCOL_LIMIT } from '../freeTier';

test('free users can have two active protocols', () => {
  expect(FREE_PROTOCOL_LIMIT).toBe(2);
  expect(canStartProtocol(0, false)).toBe(true);
  expect(canStartProtocol(1, false)).toBe(true);
  expect(canStartProtocol(2, false)).toBe(false);
});

test('Premium has no protocol limit', () => {
  expect(canStartProtocol(0, true)).toBe(true);
  expect(canStartProtocol(12, true)).toBe(true);
});

import { FREE_LOG_LIMIT, freeLogsLeft, logsUnlimited } from '../freeTier';

test('new free users get 30 entries', () => {
  const who = { premium: false, founder: 'none' as const };
  expect(FREE_LOG_LIMIT).toBe(30);
  expect(freeLogsLeft(0, who)).toBe(30);
  expect(freeLogsLeft(29, who)).toBe(1);
  expect(freeLogsLeft(30, who)).toBe(0);
  expect(freeLogsLeft(45, who)).toBe(0);
  expect(logsUnlimited(who)).toBe(false);
});

test('Premium and every founder log without a limit', () => {
  expect(freeLogsLeft(500, { premium: true, founder: 'none' })).toBeNull();
  expect(freeLogsLeft(500, { premium: false, founder: 'freeFounder' })).toBeNull();
  expect(freeLogsLeft(500, { premium: false, founder: 'paidFounder' })).toBeNull();
});
