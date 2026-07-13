import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors, radius } from '../theme';
import { useI18n } from '../lib/i18n';

export const KEY_APP_LOCK = '@mpp/app_lock_enabled';

// Optional Face ID / device-passcode lock plus a privacy cover that hides
// record content in the iOS app switcher. Free for all users — privacy is
// core to this app, not a paywalled extra.
export function AppLockGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<boolean | null>(null); // null = still reading the setting
  const [locked, setLocked] = useState(false);
  const [obscured, setObscured] = useState(false);
  const authInFlight = useRef(false);

  const unlock = useCallback(async () => {
    if (authInFlight.current) return;
    authInFlight.current = true;
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('applock.prompt'),
      });
      if (result.success) setLocked(false);
    } catch {
      // Stay locked; the button lets the user retry.
    } finally {
      authInFlight.current = false;
    }
  }, [t]);

  useEffect(() => {
    AsyncStorage.getItem(KEY_APP_LOCK)
      .then(value => {
        const on = value === 'true';
        setEnabled(on);
        if (on) setLocked(true);
      })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (enabled === null) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setObscured(false);
      } else {
        setObscured(true);
        if (enabled && state === 'background') setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  useEffect(() => {
    if (enabled && locked && !obscured) unlock();
  }, [enabled, locked, obscured, unlock]);

  const showCover = enabled === null || obscured || (enabled === true && locked);

  return (
    <View style={{ flex: 1 }}>
      {children}
      {showCover && (
        <View style={s.cover}>
          <Image source={require('../../assets/logo-symbol.png')} style={s.logo} resizeMode="contain" />
          {enabled === true && locked && !obscured && (
            <Pressable style={s.unlockBtn} onPress={unlock} accessibilityRole="button" accessibilityLabel={t('applock.unlock')}>
              <Text style={s.unlockText}>{t('applock.unlock')}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  logo: { width: 96, height: 96, opacity: 0.9 },
  unlockBtn: {
    minHeight: 50, minWidth: 200, paddingHorizontal: 28,
    backgroundColor: colors.action, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  unlockText: { color: colors.actionText, fontSize: 15, fontWeight: '700' },
});
