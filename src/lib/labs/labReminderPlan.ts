import { parseLocalDay } from '../dates';

export type LabReminderKind = 'before' | 'day' | 'after';
export type LabReminder = { id: string; kind: LabReminderKind; fireAt: Date };

/**
 * Lab reminders (Premium): 3 days before the lab date the user entered, on
 * the day, and the day after ("add your results"). 9:00 local time; only
 * future ones are returned.
 */
export function planLabReminders(nextLabDate: string | null, now: Date): LabReminder[] {
  if (!nextLabDate) return [];
  const at = (offsetDays: number) => {
    const day = parseLocalDay(nextLabDate);
    day.setDate(day.getDate() + offsetDays);
    day.setHours(9, 0, 0, 0);
    return day;
  };
  const plan: LabReminder[] = [
    { id: `lab-${nextLabDate}-before`, kind: 'before', fireAt: at(-3) },
    { id: `lab-${nextLabDate}-day`, kind: 'day', fireAt: at(0) },
    { id: `lab-${nextLabDate}-after`, kind: 'after', fireAt: at(1) },
  ];
  return plan.filter(r => r.fireAt.getTime() > now.getTime());
}
