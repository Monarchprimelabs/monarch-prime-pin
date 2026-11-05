jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

const mockRequest = jest.fn();
const mockSchedule = jest.fn();
let mockGranted = false;
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: async () => ({ granted: mockGranted, canAskAgain: true }),
  requestPermissionsAsync: (...args: unknown[]) => mockRequest(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockSchedule(...args),
  cancelScheduledNotificationAsync: async () => undefined,
  setNotificationChannelAsync: async () => undefined,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../storage', () => ({
  getProtocols: async () => [],
  getInjections: async () => [],
  getDoseSkips: async () => [],
  getVials: async () => [],
}));

import { syncExtraNotifications } from '../notify/scheduler.native';

// Handoff case 15: the scheduler never asks for permission on its own.
test('never requests permission and schedules nothing without it', async () => {
  mockGranted = false;
  await syncExtraNotifications();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockSchedule).not.toHaveBeenCalled();
});

test('schedules with permission, still without asking', async () => {
  mockGranted = true;
  await syncExtraNotifications();
  expect(mockRequest).not.toHaveBeenCalled();
  expect(mockSchedule).toHaveBeenCalled(); // weekly summary is on by default
});
