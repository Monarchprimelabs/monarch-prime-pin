import { dailyAverages, recentMean, sleepHoursByDay } from '../healthMath';

test('sleep hours count asleep stages and land on the wake-up day', () => {
  const nights = sleepHoursByDay([
    { startDate: new Date(2026, 10, 1, 23, 0), endDate: new Date(2026, 10, 2, 3, 0), value: 3 },  // core, 4 h
    { startDate: new Date(2026, 10, 2, 3, 0), endDate: new Date(2026, 10, 2, 4, 30), value: 5 }, // REM, 1.5 h
    { startDate: new Date(2026, 10, 2, 4, 30), endDate: new Date(2026, 10, 2, 5, 0), value: 2 }, // awake, ignored
    { startDate: new Date(2026, 10, 1, 22, 30), endDate: new Date(2026, 10, 2, 6, 0), value: 0 },// in bed, ignored
  ]);
  expect(nights).toEqual({ '2026-11-02': 5.5 });
});

test('daily averages and a recent mean', () => {
  const days = dailyAverages([
    { startDate: new Date(2026, 10, 1, 8), quantity: 40 },
    { startDate: new Date(2026, 10, 1, 20), quantity: 50 },
    { startDate: new Date(2026, 10, 2, 8), quantity: 60 },
  ]);
  expect(days).toEqual([{ date: '2026-11-01', value: 45 }, { date: '2026-11-02', value: 60 }]);
  expect(recentMean(days, '2026-11-02', 7)).toBe(52.5);
  expect(recentMean(days, '2026-12-30', 7)).toBeNull();
});
