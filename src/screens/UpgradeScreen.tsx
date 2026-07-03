import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardLabel, Disclaimer, Header } from '../components/UI';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { getInjections } from '../lib/storage';
import { trackPaywallView, trackUpgradeTap } from '../lib/funnel';
import { colors, radius, spacing } from '../theme';

const PRO_FEATURES = [
  'Unlimited injection logging',
  'Full reports and shareable summaries',
  'User-created schedules and local reminders',
  'Inventory and record templates',
  'Concentration worksheet',
];

export function UpgradeScreen({ onClose }: { onClose?: () => void }) {
  const {
    hasPro, source, product, monetizationEnabled, purchaseLifetime, restorePurchases,
  } = useEntitlements();
  const [working, setWorking] = useState(false);
  const [recordStats, setRecordStats] = useState<{ count: number; sites: number } | null>(null);
  const pendingPurchaseFeedback = useRef(false);

  useEffect(() => {
    if (source !== 'lifetime' || !pendingPurchaseFeedback.current) return;
    pendingPurchaseFeedback.current = false;
    Alert.alert('Lifetime Pro unlocked', 'Your one-time purchase is active. Unlimited logging is ready.');
    onClose?.();
  }, [onClose, source]);

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
      if (success) Alert.alert('Access restored', success);
    } catch (error: any) {
      Alert.alert('Unable to update access', error?.message || 'Please try again.');
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
      Alert.alert('Unable to update access', error?.message || 'Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const status = source === 'paid-app' || source === 'legacy-install'
    ? 'Founding purchaser: Lifetime Pro included'
    : source === 'lifetime'
      ? 'Lifetime Pro unlocked'
      : source === 'early-access'
        ? 'Early access: Pro tools are currently open'
        : 'Free plan';
  const price = product?.displayPrice || LIFETIME_PRO_PRICE_LABEL;

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Header title="Monarch Pro" subtitle={`Unlock unlimited usage for ${price}`} />
        {!!onClose && (
          <View style={s.closeRow}>
            <Pressable onPress={onClose} style={s.closeBtn}>
              <Text style={s.closeText}>‹ Back</Text>
            </Pressable>
          </View>
        )}

        <Card style={s.statusCard}>
          <Text style={s.statusEyebrow}>YOUR ACCESS</Text>
          <Text style={s.statusTitle}>{status}</Text>
          <Text style={s.statusBody}>
            {!hasPro && recordStats && recordStats.count > 0
              ? `You've logged ${recordStats.count} injection${recordStats.count === 1 ? '' : 's'}${recordStats.sites > 1 ? ` across ${recordStats.sites} sites` : ''}. Your records stay on this device — unlock Lifetime Pro for ${price} to keep logging without limits.`
              : `Free users can explore the app and save ${FREE_INJECTION_LIMIT} injection records. Unlock Lifetime Pro for ${price} to keep logging without limits.`}
          </Text>
        </Card>

        {!hasPro && monetizationEnabled && (
          <Card style={s.valueCard}>
            <Text style={s.valueEyebrow}>ONE PAYMENT. NO SUBSCRIPTIONS. EVER.</Text>
            <Text style={s.valueBody}>
              Most tracking apps bill you every month, forever. Monarch Prime Pin is a single {price} payment — pay once, keep every feature for as long as you use the app. No recurring charges, no trial gimmicks, nothing to cancel.
            </Text>
          </Card>
        )}

        <Card>
          <CardLabel icon="✓">ALWAYS FREE</CardLabel>
          {[
            'Explore the dashboard, history, and tools',
            `${FREE_INJECTION_LIMIT} saved injection records included`,
            'View, edit, and delete your saved free records',
            'Site rotation heatmap for saved records',
          ].map(item => <Feature key={item} text={item} />)}
        </Card>

        <Card>
          <CardLabel icon="◆">LIFETIME PRO</CardLabel>
          {PRO_FEATURES.map(item => <Feature key={item} text={item} />)}
          {!hasPro && monetizationEnabled && (
            <Pressable
              style={[s.primary, working && s.disabled]}
              disabled={working}
              onPress={buyLifetime}
            >
              <Text style={s.primaryText}>
                {working ? 'PLEASE WAIT...' : `UNLOCK UNLIMITED USAGE · ${price}`}
              </Text>
            </Pressable>
          )}
          {!hasPro && monetizationEnabled && (
            <Text style={s.purchaseFootnote}>
              One-time payment, billed once through the App Store. No subscription, no recurring charges. Your data stays on your device either way.
            </Text>
          )}
          {!monetizationEnabled && (
            <View style={s.previewNote}>
              <Text style={s.previewText}>
                Pro tools are open during early access. A one-time Lifetime Pro option will be introduced later, with no forced monthly subscription.
              </Text>
            </View>
          )}
          <Pressable
            style={[s.restore, working && s.disabled]}
            disabled={working}
            onPress={() => run(async () => {
              const restored = await restorePurchases();
              if (!restored) throw new Error('No prior purchase was found for this App Store account.');
            }, 'Your prior purchase has been restored.')}
          >
            <Text style={s.restoreText}>Restore Prior Purchase</Text>
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
