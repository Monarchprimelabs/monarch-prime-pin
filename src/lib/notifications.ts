export async function scheduleLocalReminder(
  _scheduleId: string,
  _title: string,
  _date: string,
  _time: string,
  _repeat: 'once' | 'daily' | 'weekly' = 'once',
): Promise<string> {
  throw new Error('Local reminders are available in the installed app.');
}

export async function cancelLocalReminder(_identifier?: string): Promise<void> {
  return;
}

export async function cancelAllLocalReminders(): Promise<void> {
  return;
}
