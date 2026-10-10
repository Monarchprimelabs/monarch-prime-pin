// Web build: local notifications only exist in the installed app.

export type ReminderSyncResult = { scheduled: number; permission: 'granted' | 'denied' | 'not-needed' };

export async function syncProtocolReminders(_options: { askPermission?: boolean } = {}): Promise<ReminderSyncResult> {
  return { scheduled: 0, permission: 'not-needed' };
}

export function onProtocolReminderTap(_handler: (occurrenceKey: string) => void): () => void {
  return () => undefined;
}
