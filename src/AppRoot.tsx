import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './lib/auth';
import { EntitlementProvider } from './lib/entitlements';
import { LanguageProvider } from './lib/i18n';
import { AppLockGate } from './components/AppLockGate';
import { RootNavigator } from './navigation/RootNavigator';
import { colors } from './theme';

// The full app tree lives here (instead of App.tsx) so that App.tsx can
// apply the saved theme BEFORE any of these modules — and their
// StyleSheets — are evaluated.
export function AppRoot() {
  return (
    <LanguageProvider>
      <EntitlementProvider>
        <AuthProvider>
          <StatusBar style={colors.statusBar} />
          <AppLockGate>
            <RootNavigator />
          </AppLockGate>
        </AuthProvider>
      </EntitlementProvider>
    </LanguageProvider>
  );
}
