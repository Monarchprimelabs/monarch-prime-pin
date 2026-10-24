import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFounder } from '../lib/founders';
import { useI18n } from '../lib/i18n';
import { usePaywall } from '../lib/paywall';
import { notifyPositiveMoment } from '../lib/reviewPrompt';
import { FOUNDER_CODE } from '../lib/store/constants';
import { setSheetOpen } from '../lib/paywallAuto';
import { colors, radius, spacing } from '../theme';

const KEY_SHOWN = '@mpp/founder_sheet_shown_v1';

/**
 * Shown exactly once, on the first 2.0 launch, to founders: the paid-founder
 * sheet for people who paid in 1.x, the free-founder sheet for everyone else
 * who had the app before 2.0. New users never see it.
 */
export function FounderSheetHost() {
  const { status, loading } = useFounder();
  const { openPaywall } = usePaywall();
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || status === 'none') return;
    let active = true;
    AsyncStorage.getItem(KEY_SHOWN).then(async shown => {
      if (shown || !active) return;
      await AsyncStorage.setItem(KEY_SHOWN, new Date().toISOString());
      if (active) setVisible(true);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [loading, status]);

  useEffect(() => { setSheetOpen(visible); }, [visible]);

  if (!visible) return null;
  const paid = status === 'paidFounder';
  const body = paid
    ? t('founder.paid.body')
    : [t('founder.free.body'), FOUNDER_CODE ? t('founder.free.codeLine', { code: FOUNDER_CODE }) : '', t('founder.free.tail')]
      .filter(Boolean).join('\n\n');

  const loveIt = () => {
    setVisible(false);
    notifyPositiveMoment('founderLoveIt');
  };
  const secondary = () => {
    setVisible(false);
    if (!paid) openPaywall({ kind: 'settings' });
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => setVisible(false)}>
      <View style={s.backdrop}>
        <SafeAreaView edges={['bottom']} style={s.sheet}>
          <ScrollView contentContainerStyle={{ padding: spacing.xl }}>
            <Text style={s.badge}>{t('founder.badge')}</Text>
            <Text style={s.title}>{t(paid ? 'founder.paid.title' : 'founder.free.title')}</Text>
            <Text style={s.body}>{body}</Text>
            <Pressable style={s.primary} onPress={loveIt} accessibilityRole="button">
              <Text style={s.primaryText}>{t(paid ? 'founder.paid.cta' : 'founder.free.cta')}</Text>
            </Pressable>
            <Pressable style={s.secondary} onPress={secondary} accessibilityRole="button">
              <Text style={s.secondaryText}>{t(paid ? 'founder.paid.later' : 'founder.free.seePremium')}</Text>
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
  badge: {
    alignSelf: 'flex-start', color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3, overflow: 'hidden',
  },
  title: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 12, letterSpacing: -0.4 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 12 },
  primary: { marginTop: 22, minHeight: 52, borderRadius: radius.md, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.actionText, fontSize: 16, fontWeight: '800' },
  secondary: { marginTop: 10, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
