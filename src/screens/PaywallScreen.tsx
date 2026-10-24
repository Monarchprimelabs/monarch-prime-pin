import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReadableScrollView as ScrollView } from '../components/Columns';
import { Card, Disclaimer } from '../components/UI';
import { useEntitlements } from '../lib/entitlements';
import { useFounder } from '../lib/founders';
import { useI18n } from '../lib/i18n';
import { planCopy, PlanId } from '../lib/paywallCopy';
import { markPurchaseFailed } from '../lib/paywallAuto';
import { FOUNDER_CODE, PREMIUM_ANNUAL_ID, PREMIUM_LIFETIME_ID, PREMIUM_MONTHLY_ID, PRIVACY_URL, TERMS_URL } from '../lib/store/constants';
import { isPaidFounderSource } from '../lib/store/premium';
import { trackPaywallView, trackUpgradeTap } from '../lib/funnel';
import { hapticSuccess } from '../lib/haptics';
import { colors, radius, spacing, withAlpha } from '../theme';
import { getNotifyPrefs, setNotifyPrefs, setTrialEndsAt } from '../lib/notify/store';
import { requestNotificationPermission } from '../lib/notify/scheduler';
import { syncProtocolReminders } from '../lib/protocolReminders';

// What Premium includes, in plain language, matching src/lib/featureGate.ts
// (Guideline 3.1.2(c)). Apple Health trends are iOS only.
const FEATURE_KEYS = [
  'paywall.f.heatmap', 'paywall.f.plans', 'paywall.f.charts', 'paywall.f.pdf', 'paywall.f.photos',
  'paywall.f.labs', 'paywall.f.insights', 'paywall.f.health', 'paywall.f.weekly',
];

const PRODUCT_ID: Record<PlanId, string> = { annual: PREMIUM_ANNUAL_ID, monthly: PREMIUM_MONTHLY_ID, lifetime: PREMIUM_LIFETIME_ID };

const isCancellation = (error: any) =>
  error?.code === 'E_USER_CANCELLED' || error?.code === 'USER_CANCELLED' || error?.code === 'user-cancelled'
  || /cancel/i.test(error?.message || '');

export function PaywallScreen({ onClose }: { onClose?: () => void }) {
  const { t, dateLocale } = useI18n();
  const {
    premium, products, trialEligible, monetizationEnabled, loading,
    purchase, restorePurchases, openRedeemCode, manageSubscriptions,
  } = useEntitlements();
  const { status: founder } = useFounder();
  const [plan, setPlan] = useState<PlanId>('annual');
  const [working, setWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const awaitingPurchase = useRef(false);
  const [remindTrial, setRemindTrial] = useState(false);
  // The plan and opt-in at the moment Buy was tapped, for the trial reminder.
  const startedTrial = useRef<{ remind: boolean } | null>(null);

  useEffect(() => {
    if (premium.source === 'none' && monetizationEnabled) trackPaywallView();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Purchases finish asynchronously (the store listener); confirm when they land.
  useEffect(() => {
    if (!awaitingPurchase.current || premium.source === 'none') return;
    awaitingPurchase.current = false;
    if (startedTrial.current?.remind && premium.source === 'subscription') {
      // The annual trial is one week (storekit/Products.storekit); remind 2 days before.
      const ends = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setTrialEndsAt(ends)
        .then(getNotifyPrefs)
        .then(prefs => setNotifyPrefs({ ...prefs, trialEnding: true }))
        .then(() => syncProtocolReminders())
        .catch(() => undefined);
    }
    startedTrial.current = null;
    hapticSuccess();
    Alert.alert(t('paywall.purchasedTitle'), t('paywall.purchasedBody'));
    onClose?.();
  }, [premium.source, onClose, t]);

  const prices = {
    annual: products.annual,
    monthly: products.monthly,
    lifetime: products.lifetime,
  };
  const loaded = !!(prices.annual || prices.monthly || prices.lifetime);
  // Annual is preselected; fall back to the first plan the store returned.
  useEffect(() => {
    if (prices[plan]) return;
    const first = (['annual', 'monthly', 'lifetime'] as PlanId[]).find(id => !!prices[id]);
    if (first) setPlan(first);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);
  const selected = prices[plan] ?? null;
  const copy = selected
    ? planCopy({ plan, price: selected, trialEligible: trialEligible === true, platform: Platform.OS, locale: dateLocale, t })
    : null;

  const formatDate = (ms: number) => new Date(ms).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' });

  const run = async (action: () => Promise<unknown>) => {
    if (working) return;
    setWorking(true);
    try {
      await action();
    } catch (error: any) {
      if (!isCancellation(error)) {
        markPurchaseFailed();
        Alert.alert(t('upgrade.updateFailed'), error?.message || t('common.tryAgain'));
      }
    } finally {
      setWorking(false);
    }
  };

  const buy = () => run(async () => {
    trackUpgradeTap();
    awaitingPurchase.current = true;
    startedTrial.current = plan === 'annual' && copy?.showTrialTimeline ? { remind: remindTrial } : null;
    try {
      await purchase(PRODUCT_ID[plan]);
    } catch (error) {
      awaitingPurchase.current = false;
      throw error;
    }
  });

  const restore = () => run(async () => {
    const restored = await restorePurchases();
    if (restored) Alert.alert(t('upgrade.restoredTitle'), t('upgrade.restoredBody'));
    else Alert.alert(t('upgrade.updateFailed'), t(Platform.OS === 'android' ? 'upgrade.noPurchaseAndroid' : 'upgrade.noPurchase'));
  });

  const copyCode = async () => {
    await Clipboard.setStringAsync(FOUNDER_CODE).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const paidFounder = founder === 'paidFounder' || isPaidFounderSource(premium.source);
  const subscribed = premium.source === 'subscription';
  const ownsLifetime = premium.source === 'lifetimePremium';
  const showOffers = !paidFounder && !subscribed && !ownsLifetime;

  const features = useMemo(
    () => FEATURE_KEYS.filter(key => key !== 'paywall.f.health' || Platform.OS === 'ios'),
    [],
  );

  return (
    <SafeAreaView style={s.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <View style={s.topBar}>
        <View style={{ flex: 1 }} />
        {/* The close button is always visible. */}
        <Pressable onPress={onClose} style={s.closeBtn} accessibilityRole="button" accessibilityLabel={t('paywall.close')} hitSlop={10}>
          <Text style={s.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>{t('paywall.title')}</Text>
        {(founder === 'freeFounder' || founder === 'paidFounder') && <Text style={s.founderBadge}>{t('founder.badge')}</Text>}

        {paidFounder && (
          <Card>
            <Text style={s.stateTitle}>{t('paywall.founderTitle')}</Text>
            <Text style={s.stateBody}>{t('paywall.founderBody')}</Text>
          </Card>
        )}

        {subscribed && (
          <Card>
            <Text style={s.stateTitle}>{t('paywall.haveTitle')}</Text>
            {premium.expires !== null && <Text style={s.stateBody}>{t('paywall.renews', { date: formatDate(premium.expires) })}</Text>}
            <Pressable style={s.secondaryBtn} onPress={() => run(manageSubscriptions)} accessibilityRole="button">
              <Text style={s.secondaryText}>{t('paywall.manage')}</Text>
            </Pressable>
          </Card>
        )}

        {ownsLifetime && (
          <Card>
            <Text style={s.stateTitle}>{t('paywall.haveTitle')}</Text>
            <Text style={s.stateBody}>{t('paywall.lifetimeOwned')}</Text>
          </Card>
        )}

        <Text style={s.subtitle}>{t('paywall.subtitle')}</Text>
        <View style={s.featureList}>
          {features.map(key => (
            <Text key={key} style={s.feature}>✓  {t(key)}</Text>
          ))}
        </View>

        {showOffers && founder === 'freeFounder' && !!FOUNDER_CODE && (
          <Card style={s.founderCard}>
            <Text style={s.stateTitle}>{t('paywall.founderPriceTitle')}</Text>
            <Text style={s.stateBody}>{t('paywall.founderPriceBody', { code: FOUNDER_CODE })}</Text>
            <View style={s.row}>
              <Pressable style={s.secondaryBtn} onPress={copyCode} accessibilityRole="button">
                <Text style={s.secondaryText}>{copied ? t('paywall.copied') : t('paywall.copyCode')}</Text>
              </Pressable>
              <Pressable style={s.secondaryBtn} onPress={() => run(openRedeemCode)} accessibilityRole="button">
                <Text style={s.secondaryText}>{t('paywall.redeem')}</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {showOffers && !monetizationEnabled && <Text style={s.note}>{t('paywall.notOpen')}</Text>}

        {showOffers && monetizationEnabled && loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />}

        {showOffers && monetizationEnabled && !loading && !loaded && (
          <Card>
            <Text style={s.stateBody}>{t('paywall.loadFailed')}</Text>
            <Pressable style={s.secondaryBtn} onPress={restore} accessibilityRole="button">
              <Text style={s.secondaryText}>{t('paywall.retry')}</Text>
            </Pressable>
          </Card>
        )}

        {showOffers && monetizationEnabled && loaded && (
          <>
            {(['annual', 'monthly', 'lifetime'] as PlanId[]).map(id => {
              const product = prices[id];
              if (!product) return null;
              const line = planCopy({ plan: id, price: product, trialEligible: trialEligible === true, platform: Platform.OS, locale: dateLocale, t }).priceLine;
              const active = plan === id;
              return (
                <Pressable
                  key={id}
                  onPress={() => setPlan(id)}
                  style={[s.planRow, active && s.planRowActive]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.planName}>
                      {t(id === 'annual' ? 'paywall.planAnnual' : id === 'monthly' ? 'paywall.planMonthly' : 'paywall.planLifetime')}
                    </Text>
                    <Text style={s.planPrice}>{line}</Text>
                  </View>
                  {id === 'annual' && <Text style={s.bestValue}>{t('paywall.bestValue')}</Text>}
                </Pressable>
              );
            })}

            {copy && (
              <>
                <Pressable style={[s.primaryBtn, working && { opacity: 0.6 }]} onPress={buy} disabled={working} accessibilityRole="button">
                  <Text style={s.primaryText}>{working ? '...' : copy.button}</Text>
                </Pressable>
                <Text style={s.terms}>{copy.terms}</Text>
                {copy.showTrialTimeline && selected && (
                  <Card>
                    <Text style={s.timelineTitle}>{t('paywall.timelineTitle')}</Text>
                    <Text style={s.timeline}>{t('paywall.timeline1')}</Text>
                    <Text style={s.timeline}>{t('paywall.timeline2')}</Text>
                    <Text style={s.timeline}>{t('paywall.timeline3', { price: selected.displayPrice })}</Text>
                    <View style={s.remindRow}>
                      <Text style={[s.timeline, { flex: 1 }]}>{t('notify.trialOptIn')}</Text>
                      <Switch
                        value={remindTrial}
                        onValueChange={async value => {
                          setRemindTrial(value);
                          if (value && !(await requestNotificationPermission().catch(() => false))) setRemindTrial(false);
                        }}
                        trackColor={{ false: 'rgba(120,130,150,0.4)', true: colors.primary }}
                        thumbColor={colors.white}
                        accessibilityLabel={t('notify.trialOptIn')}
                      />
                    </View>
                  </Card>
                )}
              </>
            )}
          </>
        )}

        <View style={s.links}>
          <Pressable onPress={restore} accessibilityRole="button"><Text style={s.link}>{t('paywall.restore')}</Text></Pressable>
          {showOffers && monetizationEnabled && (
            <Pressable onPress={() => run(openRedeemCode)} accessibilityRole="button"><Text style={s.link}>{t('paywall.redeem')}</Text></Pressable>
          )}
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} accessibilityRole="link"><Text style={s.link}>{t('paywall.terms')}</Text></Pressable>
          {!!PRIVACY_URL && (
            <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link"><Text style={s.link}>{t('paywall.privacy')}</Text></Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  remindRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingTop: 6 },
  closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.textMuted, fontSize: 20, fontWeight: '700' },
  content: { paddingBottom: 60 },
  title: { color: colors.white, fontSize: 26, fontWeight: '800', paddingHorizontal: spacing.xl, letterSpacing: -0.5 },
  founderBadge: {
    alignSelf: 'flex-start', marginLeft: spacing.xl, marginTop: 8, color: colors.accent, fontSize: 10, fontWeight: '800',
    letterSpacing: 1.4, borderWidth: 1, borderColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3,
    overflow: 'hidden',
  },
  subtitle: { color: colors.text, fontSize: 15, fontWeight: '600', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  featureList: { paddingHorizontal: spacing.xl, marginTop: 10, marginBottom: spacing.lg, gap: 8 },
  feature: { color: colors.text, fontSize: 14, lineHeight: 20 },
  stateTitle: { color: colors.white, fontSize: 17, fontWeight: '800' },
  stateBody: { color: colors.textMuted, fontSize: 14, lineHeight: 20, marginTop: 6 },
  founderCard: { borderColor: withAlpha(colors.accent, 0.5) },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  note: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: spacing.xl, marginVertical: 12 },
  planRow: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.xl, marginBottom: 10, padding: 16,
    borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.bgCard,
  },
  planRowActive: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.12) },
  planName: { color: colors.white, fontSize: 16, fontWeight: '800' },
  planPrice: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  bestValue: {
    color: colors.actionText, backgroundColor: colors.accent, fontSize: 9, fontWeight: '900', letterSpacing: 1,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.sm, overflow: 'hidden',
  },
  primaryBtn: {
    marginHorizontal: spacing.xl, marginTop: 6, minHeight: 54, borderRadius: radius.md, backgroundColor: colors.action,
    alignItems: 'center', justifyContent: 'center',
  },
  primaryText: { color: colors.actionText, fontSize: 16, fontWeight: '800' },
  terms: { color: colors.textMuted, fontSize: 12, lineHeight: 17, paddingHorizontal: spacing.xl, marginTop: 10, marginBottom: spacing.lg },
  timelineTitle: { color: colors.white, fontSize: 14, fontWeight: '800', marginBottom: 6 },
  timeline: { color: colors.text, fontSize: 13, lineHeight: 20 },
  secondaryBtn: {
    marginTop: 12, minHeight: 44, paddingHorizontal: 16, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  secondaryText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 18, paddingHorizontal: spacing.xl, marginTop: spacing.lg },
  link: { color: colors.textMuted, fontSize: 13, fontWeight: '600', textDecorationLine: 'underline', paddingVertical: 6 },
});
