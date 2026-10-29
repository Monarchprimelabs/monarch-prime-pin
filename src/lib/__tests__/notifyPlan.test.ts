import { inQuietHours, outsideQuietHours, planExtraNotifications, PlanInput } from '../notify/plan';
import { DEFAULT_PREFS } from '../notify/prefs';

const now = new Date(2026, 10, 10, 9, 0); // Tue Nov 10 2026, 09:00
const base: PlanInput = {
  prefs: DEFAULT_PREFS, now, premium: false, unloggedPlanDays: [], restocks: [], trialEndsAt: null, photoAnchor: '2026-11-10',
};

test('quiet hours wrap past midnight and push a notification to their end', () => {
  const quiet = { quietStart: '22:00', quietEnd: '08:00' };
  expect(inQuietHours(new Date(2026, 10, 10, 23, 0), quiet)).toBe(true);
  expect(inQuietHours(new Date(2026, 10, 10, 7, 59), quiet)).toBe(true);
  expect(inQuietHours(new Date(2026, 10, 10, 8, 0), quiet)).toBe(false);
  const moved = outsideQuietHours(new Date(2026, 10, 10, 23, 0), quiet);
  expect([moved.getDate(), moved.getHours()]).toEqual([11, 8]);
  // A follow-up at 20:00 inside a 19:00-07:00 quiet window lands at 07:00 the next day.
  const plan = planExtraNotifications({ ...base, prefs: { ...DEFAULT_PREFS, quietStart: '19:00', quietEnd: '07:00' }, unloggedPlanDays: ['2026-11-10'] });
  const followUp = plan.find(n => n.kind === 'planFollowUp')!;
  expect([followUp.fireAt.getDate(), followUp.fireAt.getHours()]).toEqual([11, 7]);
});

test('no more than 2 non-plan notifications on any day, highest priority kept', () => {
  const sunday = '2026-11-15';
  const plan = planExtraNotifications({
    ...base,
    premium: true,
    prefs: { ...DEFAULT_PREFS, photoCheckin: 'weekly', quietStart: '23:00', quietEnd: '06:00' },
    unloggedPlanDays: [sunday],
    restocks: [{ vialId: 'v1', date: sunday }],
    photoAnchor: '2026-11-08',
  });
  const onSunday = plan.filter(n => n.fireAt.getDate() === 15);
  expect(onSunday.map(n => n.kind)).toEqual(['restock', 'planFollowUp']); // weekly and photo dropped, sorted by time
});

test('each type obeys its switch; monthly report is Premium only; trial reminder is 2 days before', () => {
  expect(planExtraNotifications({ ...base, prefs: { ...DEFAULT_PREFS, weeklySummary: false } }).some(n => n.kind === 'weeklySummary')).toBe(false);
  const december = { ...base, now: new Date(2026, 10, 25, 9) };
  expect(planExtraNotifications(december).some(n => n.kind === 'monthlyReport')).toBe(false);
  expect(planExtraNotifications({ ...december, premium: true }).some(n => n.kind === 'monthlyReport')).toBe(true);
  const trialEnds = new Date(2026, 10, 17, 9);
  expect(planExtraNotifications({ ...base, trialEndsAt: trialEnds }).some(n => n.kind === 'trialEnding')).toBe(false); // opt-in
  const trial = planExtraNotifications({ ...base, prefs: { ...DEFAULT_PREFS, trialEnding: true }, trialEndsAt: trialEnds }).find(n => n.kind === 'trialEnding')!;
  expect([trial.fireAt.getDate(), trial.fireAt.getHours()]).toEqual([15, 10]);
});

test('nothing in the past or beyond 14 days', () => {
  const plan = planExtraNotifications({ ...base, restocks: [{ vialId: 'v', date: '2026-11-09' }, { vialId: 'w', date: '2027-01-30' }] });
  expect(plan.some(n => n.kind === 'restock')).toBe(false);
});
