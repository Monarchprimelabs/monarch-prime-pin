import { Platform } from 'react-native';
import { Injection } from '../data/peptides';
import { recordTimestamp } from './heat';
import { localDateISO, parseLocalDay } from './dates';

const APP_GROUP = 'group.com.monarchprime.pin';
const MS_PER_DAY = 86400000;

// Pushes a snapshot into the shared app group for the home-screen widget.
// The app writes RAW TIMESTAMPS plus pre-localized labels; the widget does
// the date math itself at render time, so "days since" keeps counting after
// the app is closed instead of freezing at whatever number was last shown.
// No compound names ever leave the app — the widget shows only counts and
// dates by design.
//
// The native module only exists in dev/production builds that included the
// widget target; in Expo Go the require fails and this becomes a no-op.
export function updateWidgetSnapshot(
  records: Injection[],
  t: (key: string, vars?: Record<string, string | number>) => string,
): void {
  if (Platform.OS !== 'ios') return;

  let ExtensionStorage: any;
  try {
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch {
    return;
  }

  try {
    const timestampsUnsorted = records.map(recordTimestamp);
    const timestamps = [...timestampsUnsorted].sort((a, b) => b - a);

    // Streak as of the LAST logged day (consecutive logged days ending
    // there). The widget applies the dashboard's grace rule itself: it
    // shows this number while the gap since the last record is <= 1 day
    // and zero after, so the streak breaks on time without the app open.
    const logDays = new Set(records.map(r => r.date).filter(Boolean));
    let latestDate: string | null = null;
    let latestTs = -Infinity;
    records.forEach((r, i) => {
      const ts = timestampsUnsorted[i];
      if (ts > latestTs) { latestTs = ts; latestDate = r.date; }
    });
    let streakBase = 0;
    if (latestDate) {
      const cursor = parseLocalDay(latestDate);
      while (logDays.has(localDateISO(cursor))) {
        streakBase += 1;
        cursor.setDate(cursor.getDate() - 1);
      }
    }

    // Epoch SECONDS (what Date(timeIntervalSince1970:) expects), newest
    // first. 30 days comfortably covers the widget's rolling 7-day count;
    // the cap keeps the string tiny for even the heaviest logger.
    const cutoff = Date.now() - 30 * MS_PER_DAY;
    const recent = timestamps
      .filter(ts => ts >= cutoff)
      .slice(0, 200)
      .map(ts => String(Math.floor(ts / 1000)))
      .join(',');

    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('widget_last_ts', timestamps.length ? String(Math.floor(timestamps[0] / 1000)) : '');
    storage.set('widget_recent_ts', recent);
    storage.set('widget_word_today', t('widget.today'));
    storage.set('widget_label_days', t('widget.daysSince'));
    storage.set('widget_label_last7', t('widget.last7'));
    storage.set('widget_streak_base', String(streakBase));
    storage.set('widget_label_streak', t('dash.dayStreak'));
    // Total only changes inside the app, so a pre-formatted line stays true.
    storage.set('widget_line_total', t('widget.total', { n: records.length }));
    ExtensionStorage.reloadWidget();
  } catch {
    // Widget updates are strictly best-effort.
  }
}

// Temporary field diagnostic for the widget data pipe: reports whether the
// native module is linked, whether a probe value written through it can be
// read straight back from the shared app group, and what the widget's own
// keys currently hold. Surfaced from the Tools screen; remove once the
// widget is confirmed working in production.
export function widgetDiagnostic(): string {
  if (Platform.OS !== 'ios') return 'iOS only';
  const lines: string[] = [];
  const native = (globalThis as any).expo?.modules?.ExtensionStorage;
  lines.push('native module: ' + (native ? 'present' : 'MISSING'));
  let ExtensionStorage: any;
  try {
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch (error) {
    lines.push('require failed: ' + String(error));
    return lines.join('\n');
  }
  try {
    const storage = new ExtensionStorage(APP_GROUP);
    const probe = 'diag-' + Date.now();
    storage.set('widget_diag', probe);
    const readBack = storage.get('widget_diag');
    lines.push('write+readback: ' + (readBack === probe ? 'OK' : 'FAILED got ' + JSON.stringify(readBack ?? null)));
    lines.push('widget_last_ts: ' + JSON.stringify(storage.get('widget_last_ts') ?? null));
    lines.push('widget_line_total: ' + JSON.stringify(storage.get('widget_line_total') ?? null));
  } catch (error) {
    lines.push('error: ' + String(error));
  }
  return lines.join('\n');
}
