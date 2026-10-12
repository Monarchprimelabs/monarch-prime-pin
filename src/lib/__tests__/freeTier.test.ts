import { canStartProtocol, FREE_PROTOCOL_LIMIT } from '../freeTier';

test('free users can start one active protocol', () => {
  expect(FREE_PROTOCOL_LIMIT).toBe(1);
  expect(canStartProtocol(0, false)).toBe(true);
  expect(canStartProtocol(1, false)).toBe(false);
  expect(canStartProtocol(3, false)).toBe(false);
});

test('Pro has no protocol limit', () => {
  expect(canStartProtocol(0, true)).toBe(true);
  expect(canStartProtocol(12, true)).toBe(true);
});
