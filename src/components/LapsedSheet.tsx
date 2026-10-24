import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEntitlements } from '../lib/entitlements';
import { useI18n } from '../lib/i18n';
import { usePaywall } from '../lib/paywall';
import { claimAutoPaywall, setSheetOpen } from '../lib/paywallAuto';
import { syncLabReminders } from '../lib/labReminders';
import { colors, radius, spacing } from '../theme';

const KEY_SHOWN = '@mpp/lapsed_sheet_shown_v1';

/**
 * When a subscription ends: one "Premium ended, your data is safe" sheet per
 * lapse, within the automatic-paywall caps. Nothing is deleted or hidden;
 * Premium-only views lock again with their badge. Lab reminders stop.
 */
export function LapsedSheetHost() {
  const { lapsed, hasPro } = useEntitlements();
  const { openPaywall } = usePaywall();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Premium is back: the next lapse gets its own sheet.
    if (hasPro) { AsyncStorage.removeItem(KEY_SHOWN).catch(() => undefined); return; }
    if (!lapsed) return;
    let active = true;
    syncLabReminders({ allowed: false, askPermission: false }).catch(() => undefined);
    AsyncStorage.getItem(KEY_SHOWN).then(async shown => {
      if (shown || !active) return;
      if (!(await claimAutoPaywall('lapsed', false))) return;
      await AsyncStorage.setItem(KEY_SHOWN, new Date().toISOString());
      if (active) setVisible(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [lapsed, hasPro]);

  useEffect(() => { setSheetOpen(visible); }, [visible]);

  if (!visible) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setVisible(false)}>
      <View style={s.backdrop}>
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
            <Text style={s.title}>{t('lapsed.title')}</Text>
            <Text style={s.body}>{t('lapsed.body')}</Text>
            <Pressable
              style={s.primary}
              onPress={() => { setVisible(false); openPaywall({ kind: 'lapsed' }); }}
              accessibilityRole="button"
            >
              <Text style={s.primaryText}>{t('lapsed.resubscribe')}</Text>
            </Pressable>
            <Pressable style={s.secondary} onPress={() => setVisible(false)} accessibilityRole="button">
              <Text style={s.secondaryText}>{t('lapsed.notNow')}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bgSheet, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '88%', width: '100%', maxWidth: 680, alignSelf: 'center' },
  title: { color: colors.white, fontSize: 24, fontWeight: '800', letterSpacing: -0.4 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 12 },
  primary: { marginTop: 22, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.actionText, fontSize: 16, fontWeight: '800' },
  secondary: { marginTop: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
