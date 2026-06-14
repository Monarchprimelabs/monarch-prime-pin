import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardLabel, Disclaimer, Header } from '../components/UI';
import { useEntitlements } from '../lib/entitlements';
import { colors, radius, spacing } from '../theme';

const PRO_FEATURES = [
  'Advanced reports and shareable summaries',
  'User-created schedules and local reminders',
  'Inventory and reusable record templates',
  'Concentration worksheet',
];

export function UpgradeScreen({ onClose }: { onClose?: () => void }) {
  const {
    hasPro, source, product, monetizationEnabled, purchaseLifetime, restorePurchases,
  } = useEntitlements();
  const [working, setWorking] = useState(false);

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

  const status = source === 'paid-app' || source === 'legacy-install'
    ? 'Founding purchaser: Lifetime Pro included'
    : source === 'lifetime'
      ? 'Lifetime Pro unlocked'
      : source === 'early-access'
        ? 'Early access: Pro tools are currently open'
        : 'Free plan';

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Header title="Monarch Pro" subtitle="Core tracking always stays free" />
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
            Tracking, complete history, calendar review, and site rotation remain available without a subscription.
          </Text>
        </Card>

        <Card>
          <CardLabel icon="✓">ALWAYS FREE</CardLabel>
          {[
            'Unlimited manual tracking',
            'Complete log history and calendar',
            'Injection-site selection and heatmap',
            'Basic activity overview',
          ].map(item => <Feature key={item} text={item} />)}
        </Card>

        <Card>
          <CardLabel icon="◆">LIFETIME PRO</CardLabel>
          {PRO_FEATURES.map(item => <Feature key={item} text={item} />)}
          {!hasPro && monetizationEnabled && (
            <Pressable
              style={[s.primary, working && s.disabled]}
              disabled={working}
              onPress={() => run(purchaseLifetime)}
            >
              <Text style={s.primaryText}>
                {working ? 'PLEASE WAIT...' : `UNLOCK LIFETIME PRO${product ? ` · ${product.displayPrice}` : ''}`}
              </Text>
            </Pressable>
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
