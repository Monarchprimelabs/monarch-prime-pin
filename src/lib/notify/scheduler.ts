// Web build: local notifications only exist in the installed app.
export async function syncExtraNotifications(): Promise<void> {}
export async function requestNotificationPermission(): Promise<boolean> { return false; }
