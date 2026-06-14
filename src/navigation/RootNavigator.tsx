import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '../lib/auth';
import { getOnboardingDone } from '../lib/storage';
import { SignInScreen } from '../screens/SignInScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { BottomTabs } from './BottomTabs';
import { colors } from '../theme';
import { useEntitlements } from '../lib/entitlements';

export function RootNavigator() {
  const { user, loading } = useAuth();
  const { loading: entitlementLoading } = useEntitlements();
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
      <OnboardingScreen onDone={() => setOnboardingDone(true)} />
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
