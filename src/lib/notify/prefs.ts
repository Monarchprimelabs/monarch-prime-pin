// Settings > Notifications. Every notification type has its own switch, all
// visible in Settings (Guideline 2.5.19). No promotional notifications exist,
// so there is no "News and offers" switch to turn on (4.5.4).

export type PhotoCheckin = 'off' | 'weekly' | 'biweekly' | 'monthly';

export type NotifyPrefs = {
  planFollowUp: boolean;   // one note at 20:00 if today's planned entry isn't logged
  vialLow: boolean;        // when a vial is about to run short
  restock: boolean;        // on the restock date the user sets per vial
  weeklySummary: boolean;  // Sunday 18:00
  monthlyReport: boolean;  // 1st of the month 09:00 (Premium)
  photoCheckin: PhotoCheckin;
  trialEnding: boolean;    // opt-in on the paywall
  quietStart: string;      // "22:00"
  quietEnd: string;        // "08:00"
};

export const DEFAULT_PREFS: NotifyPrefs = {
  planFollowUp: true,
  vialLow: true,
  restock: true,
  weeklySummary: true,
  monthlyReport: true,
  photoCheckin: 'off',
  trialEnding: false,
  quietStart: '22:00',
  quietEnd: '08:00',
};

/** Non-plan notifications per day, at most. Plan reminders are never capped. */
export const DAILY_CAP = 2;

export function withDefaults(raw: Partial<NotifyPrefs> | null | undefined): NotifyPrefs {
  return { ...DEFAULT_PREFS, ...(raw ?? {}) };
}
