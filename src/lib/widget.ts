import { Platform } from 'react-native';
import { Injection } from '../data/peptides';
import { localDateISO, parseLocalDay } from './dates';

const APP_GROUP = 'group.com.monarchprime.pin';
const MS_PER_DAY = 86400000;

// Pushes a small, pre-localized snapshot into the shared app group for the
// home-screen widget. No compound names ever leave the app — the widget
// shows only counts and dates by design.
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
    const latest = [...records].sort(
      (a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
    )[0];

    let big = '—';
    if (latest) {
      const today = parseLocalDay(localDateISO()).getTime();
      const last = parseLocalDay(latest.date).getTime();
      const daysSince = Math.max(0, Math.round((today - last) / MS_PER_DAY));
      big = daysSince === 0 ? t('widget.today') : String(daysSince);
    }

    const storage = new ExtensionStorage(APP_GROUP);
    storage.set('widget_big', big);
    storage.set('widget_line1', t('widget.daysSince'));
    storage.set('widget_line2', t('widget.total', { n: records.length }));
    ExtensionStorage.reloadWidget();
  } catch {
    // Widget updates are strictly best-effort.
  }
}
