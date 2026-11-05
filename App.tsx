import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { Image, Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { loadTheme } from './src/theme';
import { snapshotFounderEvidence } from './src/lib/founderEvidence';

// The saved theme must be applied before any screen module is evaluated,
// because StyleSheets capture theme values at import time. The app tree is
// therefore require()d only after loadColorway() resolves; until then we
// show a bare background matching the splash color.
export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    // The founder check must see storage exactly as 1.x left it, so it runs
    // before anything else in 2.0 reads or writes a key.
    snapshotFounderEvidence()
      .catch(() => undefined)
      .then(loadTheme)
      .finally(() => setReady(true));
  }, []);

  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const sources = [
      Image.resolveAssetSource(require('./assets/logo-symbol.png'))?.uri,
      Image.resolveAssetSource(require('./assets/logo-full.png'))?.uri,
    ].filter((source): source is string => !!source);
    Promise.all(sources.map(source => Image.prefetch(source))).catch(() => undefined);
  }, []);

  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: '#050810' }} />;
  }

  const { AppRoot } = require('./src/AppRoot');
  return (
    <SafeAreaProvider>
      <AppRoot />
    </SafeAreaProvider>
  );
}
