import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/lib/auth';
import { EntitlementProvider } from './src/lib/entitlements';
import { AppLockGate } from './src/components/AppLockGate';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  React.useEffect(() => {
    if (Platform.OS === 'web') return;

    const sources = [
      Image.resolveAssetSource(require('./assets/logo-symbol.png')).uri,
      Image.resolveAssetSource(require('./assets/logo-full.png')).uri,
    ];
    Promise.all(sources.map(source => Image.prefetch(source))).catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <EntitlementProvider>
        <AuthProvider>
          <StatusBar style="light" />
          <AppLockGate>
            <RootNavigator />
          </AppLockGate>
        </AuthProvider>
      </EntitlementProvider>
    </SafeAreaProvider>
  );
}
