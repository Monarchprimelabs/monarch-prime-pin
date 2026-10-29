import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from './UI';
import { colors, radius } from '../theme';
import { useI18n } from '../lib/i18n';
import { usePaywall } from '../lib/paywall';
import type { Feature } from '../lib/featureGate';

/** Small "PREMIUM" tag with a lock, for rows and buttons. */
export function PremiumBadge() {
  const { t } = useI18n();
  return <Text style={s.badge}>🔒 {t('premium.badge')}</Text>;
}

/**
 * Stands in for a Premium feature: shows what it is and opens the paywall.
 * The feature stays visible, never hidden (Guideline 2.5.19).
 */
export function PremiumLockCard({ feature, title, body }: { feature: Feature; title: string; body?: string }) {
  const { t } = useI18n();
  const { openPaywall } = usePaywall();
  return (
    <Card>
      <Pressable
        onPress={() => openPaywall({ kind: 'lockedFeature', feature })}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${t('premium.unlock')}`}
      >
        <View style={s.row}>
          <Text style={s.title}>{title}</Text>
          <PremiumBadge />
        </View>
        <Text style={s.body}>{body || t('premium.lockedBody')}</Text>
        <Text style={s.cta}>{t('premium.unlock')} ›</Text>
      </Pressable>
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  title: { color: colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginTop: 6 },
  cta: { color: colors.primary, fontSize: 14, fontWeight: '700', marginTop: 10 },
  badge: {
    color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 5, paddingVertical: 2,
    overflow: 'hidden',
  },
});
