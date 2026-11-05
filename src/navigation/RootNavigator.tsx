import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { getOnboardingDone } from '../lib/storage';
import { SignInScreen } from '../screens/SignInScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { BottomTabs } from './BottomTabs';
import { colors } from '../theme';
import { AuroraBackground } from '../components/Glass';
import { useEntitlements } from '../lib/entitlements';
import { usePaywall } from '../lib/paywall';
import { DEMO, seedDemoData } from '../lib/demo';

export function RootNavigator() {
  const { user, loading, startLocal } = useAuth();
  const { loading: entitlementLoading } = useEntitlements();
  const { maybeAutoPaywall } = usePaywall();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Web demo: straight in, no sign-in screen.
  useEffect(() => {
    if (DEMO && !loading && !user) startLocal('').catch(() => undefined);
  }, [loading, user, startLocal]);

  useEffect(() => {
    if (!user) {
      setOnboardingChecked(false);
      return;
    }
    (DEMO ? seedDemoData().catch(() => undefined) : Promise.resolve()).then(getOnboardingDone).then(done => {
      setOnboardingDone(done);
      setOnboardingChecked(true);
    });
  }, [user]);

  if (loading || entitlementLoading || (user && !onboardingChecked)) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!user) return <View style={s.fill}><AuroraBackground /><SignInScreen /></View>;

  if (!onboardingDone) {
    return (
      <View style={s.fill}>
        <AuroraBackground />
        <OnboardingScreen onDone={() => {
          setOnboardingDone(true);
          // A soft, dismissible paywall once, at the end of onboarding.
          maybeAutoPaywall('onboardingEnd').catch(() => undefined);
        }} />
      </View>
    );
  }

  return <BottomTabs />;
}

const s = StyleSheet.create({
  fill: { flex: 1 },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
