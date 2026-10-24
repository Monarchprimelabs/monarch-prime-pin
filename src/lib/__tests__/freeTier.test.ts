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
