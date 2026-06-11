import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/auth';
import { ThemePreferenceProvider, useThemePreference } from './src/lib/themePreference';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  React.useEffect(() => {
    const sources = [
      Image.resolveAssetSource(require('./assets/logo-symbol.png')).uri,
      Image.resolveAssetSource(require('./assets/logo-full.png')).uri,
    ];
    Promise.all(sources.map(source => Image.prefetch(source))).catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AuthProvider>
          <ThemedApp />
        </AuthProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const { resolved } = useThemePreference();
  return (
    <>
      <StatusBar style={resolved === 'light' ? 'dark' : 'light'} />
      <RootNavigator />
    </>
  );
}
