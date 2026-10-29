import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { getOnboardingDone } from '../lib/storage';
import { SignInScreen } from '../screens/SignInScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { BottomTabs } from './BottomTabs';
import { colors } from '../theme';
import { useEntitlements } from '../lib/entitlements';
import { usePaywall } from '../lib/paywall';

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { loading: entitlementLoading } = useEntitlements();
  const { maybeAutoPaywall } = usePaywall();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!user) {
      setOnboardingChecked(false);
      return;
    }
    getOnboardingDone().then(done => {
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

  if (!user) return <SignInScreen />;

  if (!onboardingDone) {
    return (
      <OnboardingScreen onDone={() => {
        setOnboardingDone(true);
        // A soft, dismissible paywall once, at the end of onboarding.
        maybeAutoPaywall('onboardingEnd').catch(() => undefined);
      }} />
    );
  }

  return <BottomTabs />;
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
