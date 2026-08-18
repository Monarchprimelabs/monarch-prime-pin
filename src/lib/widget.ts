import { Platform } from 'react-native';
import { Injection } from '../data/peptides';
import { recordTimestamp } from './heat';

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
    const timestamps = records
      .map(recordTimestamp)
      .sort((a, b) => b - a);

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
    // Total only changes inside the app, so a pre-formatted line stays true.
    storage.set('widget_line_total', t('widget.total', { n: records.length }));
    ExtensionStorage.reloadWidget();
  } catch {
    // Widget updates are strictly best-effort.
  }
}
