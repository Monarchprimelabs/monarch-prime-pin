import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardLabel, Disclaimer, Header } from '../components/UI';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { getInjections } from '../lib/storage';
import { trackPaywallView, trackUpgradeTap } from '../lib/funnel';
import { hapticSuccess } from '../lib/haptics';
import { colors, radius, spacing } from '../theme';
import { useI18n } from '../lib/i18n';

const PRO_FEATURE_KEYS = [
  'upgrade.pro1',
  'upgrade.pro2',
  'upgrade.pro3',
  'upgrade.pro4',
  'upgrade.pro5',
];

export function UpgradeScreen({ onClose }: { onClose?: () => void }) {
  const { t } = useI18n();
  const {
    hasPro, source, product, monetizationEnabled, purchaseLifetime, restorePurchases,
  } = useEntitlements();
  const [working, setWorking] = useState(false);
  const [recordStats, setRecordStats] = useState<{ count: number; sites: number } | null>(null);
  const pendingPurchaseFeedback = useRef(false);

  useEffect(() => {
    if (source !== 'lifetime' || !pendingPurchaseFeedback.current) return;
    pendingPurchaseFeedback.current = false;
    hapticSuccess();
    Alert.alert(t('upgrade.purchasedTitle'), t('upgrade.purchasedBody'));
    onClose?.();
  }, [onClose, source, t]);

  useEffect(() => {
    if (!hasPro && monetizationEnabled) trackPaywallView();
    // Count once per screen mount, only for users who can actually purchase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let active = true;
    getInjections()
      .then(records => {
        if (!active) return;
        const sites = new Set(records.map(record => record.site).filter(Boolean)).size;
        setRecordStats({ count: records.length, sites });
      })
      .catch(() => undefined); // Personalized copy is optional; fall back to generic text.
    return () => { active = false; };
  }, []);

  const isPurchaseCancellation = (error: any) => (
    error?.code === 'E_USER_CANCELLED'
    || error?.code === 'USER_CANCELLED'
    || /cancel/i.test(error?.message || '')
  );

  const run = async (action: () => Promise<void>, success?: string) => {
    setWorking(true);
    try {
      await action();
      if (success) Alert.alert(t('upgrade.restoredTitle'), success);
    } catch (error: any) {
      Alert.alert(t('upgrade.updateFailed'), error?.message || t('common.tryAgain'));
    } finally {
      setWorking(false);
    }
  };

  const buyLifetime = async () => {
    trackUpgradeTap();
    pendingPurchaseFeedback.current = true;
    setWorking(true);
    try {
      await purchaseLifetime();
    } catch (error: any) {
      pendingPurchaseFeedback.current = false;
      if (isPurchaseCancellation(error)) return;
      Alert.alert(t('upgrade.updateFailed'), error?.message || t('common.tryAgain'));
    } finally {
      setWorking(false);
    }
  };

  const status = source === 'paid-app' || source === 'legacy-install'
    ? t('upgrade.statusFounding')
    : source === 'lifetime'
      ? t('upgrade.statusLifetime')
      : source === 'early-access'
        ? t('upgrade.statusEarly')
        : t('access.freePlan');
  const price = product?.displayPrice || LIFETIME_PRO_PRICE_LABEL;

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Header title="Monarch Pro" subtitle={t('upgrade.subtitle', { price })} />
        {!!onClose && (
          <View style={s.closeRow}>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>{t('upgrade.back')}</Text>
            </Pressable>
          </View>
        )}

        <Card style={s.statusCard}>
          <Text style={s.statusEyebrow}>{t('access.label')}</Text>
          <Text style={s.statusTitle}>{status}</Text>
          <Text style={s.statusBody}>
            {!hasPro && recordStats && recordStats.count > 0
              ? (recordStats.count === 1 ? t('upgrade.loggedOne') : t('upgrade.loggedMany', { n: recordStats.count }))
                + (recordStats.sites > 1 ? t('upgrade.acrossSites', { sites: recordStats.sites }) : '')
                + t('upgrade.keepLogging', { price })
              : t('upgrade.bodyGeneric', { max: FREE_INJECTION_LIMIT, price })}
          </Text>
        </Card>

        {!hasPro && monetizationEnabled && (
          <Card style={s.valueCard}>
            <Text style={s.valueEyebrow}>{t('upgrade.valueEyebrow')}</Text>
            <Text style={s.valueBody}>
              {t('upgrade.valueBody', { price })}
            </Text>
          </Card>
        )}

        <Card>
          <CardLabel icon="✓">{t('upgrade.alwaysFree')}</CardLabel>
          {[
            t('upgrade.free1'),
            t('upgrade.free2', { max: FREE_INJECTION_LIMIT }),
            t('upgrade.free3'),
            t('upgrade.free4'),
          ].map(item => <Feature key={item} text={item} />)}
        </Card>

        <Card>
          <CardLabel icon="◆">{t('upgrade.lifetimePro')}</CardLabel>
          {PRO_FEATURE_KEYS.map(key => <Feature key={key} text={t(key)} />)}
          {!hasPro && monetizationEnabled && (
            <Pressable
              style={[s.primary, working && s.disabled]}
              disabled={working}
              onPress={buyLifetime}
            >
              <Text style={s.primaryText}>
                {working ? t('upgrade.wait') : t('upgrade.unlockBtn', { price })}
              </Text>
            </Pressable>
          )}
          {!hasPro && monetizationEnabled && (
            <Text style={s.purchaseFootnote}>
              {t('upgrade.footnote')}
            </Text>
          )}
          {!monetizationEnabled && (
            <View style={s.previewNote}>
              <Text style={s.previewText}>
                {t('upgrade.previewNote')}
              </Text>
            </View>
          )}
          <Pressable
            style={[s.restore, working && s.disabled]}
            disabled={working}
            onPress={() => run(async () => {
              const restored = await restorePurchases();
              if (!restored) throw new Error(t('upgrade.noPurchase'));
            }, t('upgrade.restoredBody'))}
          >
            <Text style={s.restoreText}>{t('upgrade.restore')}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <View style={s.feature}>
      <Text style={s.check}>✓</Text>
      <Text style={s.featureText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  closeRow: { paddingHorizontal: spacing.xl, marginTop: -10, marginBottom: spacing.md },
  closeBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  closeText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  statusCard: { borderColor: colors.primary, backgroundColor: 'rgba(30,136,229,0.09)' },
  statusEyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.8, marginBottom: 8 },
  statusTitle: { color: colors.white, fontSize: 19, fontWeight: '700', marginBottom: 8 },
  statusBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  valueCard: { borderColor: colors.teal, backgroundColor: 'rgba(20,184,166,0.08)' },
  valueEyebrow: { color: colors.teal, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  valueBody: { color: colors.text, fontSize: 13, lineHeight: 20 },
  purchaseFootnote: { color: colors.textMuted, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 10 },
  feature: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'center' },
  check: { color: colors.teal, fontSize: 14, fontWeight: '700' },
  featureText: { color: colors.text, fontSize: 13, flex: 1 },
  primary: { minHeight: 50, marginTop: 16, backgroundColor: colors.action, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.actionText, fontSize: 13, fontWeight: '700', letterSpacing: 0.8 },
  restore: { minHeight: 46, marginTop: 10, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  restoreText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  previewNote: { backgroundColor: 'rgba(20,184,166,0.08)', borderLeftWidth: 3, borderLeftColor: colors.teal, padding: 12, marginTop: 14 },
  previewText: { color: colors.text, fontSize: 12, lineHeight: 18 },
});
