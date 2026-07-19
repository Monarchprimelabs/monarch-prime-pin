import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../components/UI';
import { colors, radius, spacing } from '../theme';
import { setOnboardingDone } from '../lib/storage';
import { FREE_INJECTION_LIMIT } from '../lib/entitlements';
import { useI18n } from '../lib/i18n';

type MultiItem = { id: string; labelKey: string; icon: string };
type SingleItem = { id: string; labelKey: string; icon: string; subKey?: string };

// ── Step data ────────────────────────────────────────────────
const TRACK_OPTIONS: MultiItem[] = [
  { id: 'compounds',     labelKey: 'ob.track.compounds',  icon: '🧪' },
  { id: 'logs',          labelKey: 'ob.track.logs',       icon: '📋' },
  { id: 'notes',         labelKey: 'ob.track.notes',      icon: '📝' },
  { id: 'inventory',     labelKey: 'ob.track.inventory',  icon: '📦' },
  { id: 'photos',        labelKey: 'ob.track.photos',     icon: '📷' },
  { id: 'reminders',     labelKey: 'ob.track.reminders',  icon: '🔔' },
  { id: 'references',    labelKey: 'ob.track.references', icon: '🗂️' },
];

const GOAL_OPTIONS: SingleItem[] = [
  { id: 'consistent', labelKey: 'ob.goal.consistent', icon: '✅', subKey: 'ob.goal.consistentSub' },
  { id: 'history',    labelKey: 'ob.goal.history',    icon: '🕘', subKey: 'ob.goal.historySub' },
  { id: 'inventory',  labelKey: 'ob.goal.inventory',  icon: '📦', subKey: 'ob.goal.inventorySub' },
  { id: 'sites',      labelKey: 'ob.goal.sites',      icon: '📍', subKey: 'ob.goal.sitesSub' },
  { id: 'photos',     labelKey: 'ob.goal.photos',     icon: '📷', subKey: 'ob.goal.photosSub' },
  { id: 'summaries',  labelKey: 'ob.goal.summaries',  icon: '📊', subKey: 'ob.goal.summariesSub' },
];

const TOTAL_STEPS = 3;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);
  const [trackSelected, setTrackSelected] = useState<string[]>([]);
  const [goalSelected, setGoalSelected] = useState<string>('');

  const { width } = useWindowDimensions();

  const toggleMulti = (
    id: string,
    state: string[],
    setState: (v: string[]) => void,
  ) => setState(state.includes(id) ? state.filter(x => x !== id) : [...state, id]);

  const canContinue = () => {
    if (step === 1) return goalSelected !== '';
    if (step === 2) return trackSelected.length > 0;
    return true;
  };

  const handleContinue = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      await setOnboardingDone();
      onDone();
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      {step === 0 ? (
        <WelcomeStep onStart={() => setStep(1)} />
      ) : (
        <View style={{ flex: 1 }}>
          {/* Progress bar */}
          <ProgressBar step={step} total={TOTAL_STEPS - 1} width={width} />
          <View style={s.topNav}>
            <Pressable
              style={s.backBtn}
              onPress={() => setStep(s => Math.max(0, s - 1))}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Text style={s.backIcon}>‹</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {step === 1 && (
              <StepShell
                headline={t('ob.step1Head')}
                sub={t('ob.step1Sub')}
              >
                <SingleSelect
                  options={GOAL_OPTIONS}
                  selected={goalSelected}
                  onSelect={setGoalSelected}
                />
              </StepShell>
            )}

            {step === 2 && (
              <StepShell
                headline={t('ob.step2Head')}
                sub={t('ob.step2Sub')}
              >
                <MultiSelect
                  options={TRACK_OPTIONS}
                  selected={trackSelected}
                  onToggle={id => toggleMulti(id, trackSelected, setTrackSelected)}
                />
              </StepShell>
            )}
          </ScrollView>

          {/* CTA */}
          <View style={s.footer}>
            <Pressable
              style={[s.ctaBtn, !canContinue() && s.ctaBtnDisabled]}
              onPress={handleContinue}
              disabled={!canContinue()}
            >
              <Text style={s.ctaBtnText}>
                {step === TOTAL_STEPS - 1 ? t('ob.letsGo') : t('ob.continue')}
              </Text>
            </Pressable>
            <Text style={s.stepCount}>{t('ob.stepCount', { step, total: TOTAL_STEPS - 1 })}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Welcome (step 0) ─────────────────────────────────────────
function WelcomeStep({ onStart }: { onStart: () => void }) {
  const { t } = useI18n();
  return (
    <View style={s.welcomeRoot}>
      <View style={s.welcomeLogoWrap}>
        <BrandMark large />
      </View>

      <View style={s.welcomeBody}>
        <Text style={s.welcomeEyebrow}>MONARCH PRIME PIN</Text>
        <Text style={s.welcomeHeadline}>{t('ob.headline')}</Text>
        <Text style={s.welcomeSub}>
          {t('ob.welcomeSub', { max: FREE_INJECTION_LIMIT })}
        </Text>

        <View style={s.featureList}>
          {[
            { icon: '📋', key: 'ob.feat1' },
            { icon: '📍', key: 'ob.feat2' },
            { icon: '🕘', key: 'ob.feat3' },
            { icon: '◆', key: 'ob.feat4' },
          ].map(f => (
            <View key={f.key} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.welcomeFooter}>
        <Pressable style={s.ctaBtn} onPress={onStart}>
          <Text style={s.ctaBtnText}>{t('ob.getStarted')}</Text>
        </Pressable>
        <Text style={s.complianceNote}>
          {t('ob.compliance', { max: FREE_INJECTION_LIMIT })}
        </Text>
      </View>
    </View>
  );
}

// ── Progress bar ─────────────────────────────────────────────
function ProgressBar({ step, total, width }: { step: number; total: number; width: number }) {
  const fillPct = step / total;
  return (
    <View style={[s.progressWrap, { width }]}>
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${fillPct * 100}%` }]} />
      </View>
    </View>
  );
}

// ── Step shell ───────────────────────────────────────────────
function StepShell({ headline, sub, children }: { headline: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={s.stepShell}>
      <Text style={s.stepHeadline}>{headline}</Text>
      <Text style={s.stepSub}>{sub}</Text>
      <View style={s.optionsWrap}>{children}</View>
    </View>
  );
}

// ── Multi-select cards ───────────────────────────────────────
function MultiSelect({
  options, selected, onToggle,
}: { options: MultiItem[]; selected: string[]; onToggle: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <>
      {options.map(opt => {
        const active = selected.includes(opt.id);
        return (
          <Pressable
            key={opt.id}
            style={[s.optCard, active && s.optCardActive]}
            onPress={() => onToggle(opt.id)}
          >
            <Text style={s.optIcon}>{opt.icon}</Text>
            <Text style={[s.optLabel, active && s.optLabelActive]}>{t(opt.labelKey)}</Text>
            <View style={[s.optCheck, active && s.optCheckActive]}>
              {active && <Text style={s.optCheckMark}>✓</Text>}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

// ── Single-select cards ──────────────────────────────────────
function SingleSelect({
  options, selected, onSelect,
}: { options: SingleItem[]; selected: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <>
      {options.map(opt => {
        const active = selected === opt.id;
        return (
          <Pressable
            key={opt.id}
            style={[s.optCard, active && s.optCardActive]}
            onPress={() => onSelect(opt.id)}
          >
            <Text style={s.optIcon}>{opt.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[s.optLabel, active && s.optLabelActive]}>{t(opt.labelKey)}</Text>
              {!!opt.subKey && <Text style={s.optSub}>{t(opt.subKey)}</Text>}
            </View>
            <View style={[s.optCheck, active && s.optCheckActive]}>
              {active && <Text style={s.optCheckMark}>✓</Text>}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

// ── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Welcome
  welcomeRoot: { flex: 1, paddingHorizontal: spacing.xl },
  welcomeLogoWrap: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  welcomeBody: { flex: 1 },
  welcomeEyebrow: {
    fontSize: 11, fontWeight: '700', letterSpacing: 2.5,
    color: colors.primary, marginBottom: 12,
  },
  welcomeHeadline: {
    fontSize: 30, fontWeight: '800', color: colors.white,
    lineHeight: 38, marginBottom: 16, letterSpacing: 0,
  },
  welcomeSub: {
    fontSize: 15, color: colors.textMuted, lineHeight: 24, marginBottom: 28,
  },
  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  featureText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  welcomeFooter: { paddingBottom: 12, gap: 14 },
  complianceNote: {
    textAlign: 'center', fontSize: 11,
    color: colors.textFaint, lineHeight: 16,
  },

  // Progress bar
  progressWrap: { paddingHorizontal: spacing.xl, paddingTop: 16, paddingBottom: 4 },
  progressTrack: {
    height: 4, backgroundColor: 'rgba(30,136,229,0.15)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.primary,
    borderRadius: 2,
  },
  topNav: {
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    minHeight: 46,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    color: colors.white,
    fontSize: 30,
    lineHeight: 32,
    fontWeight: '500',
  },

  // Step shell
  scrollContent: { paddingBottom: 24 },
  stepShell: { paddingHorizontal: spacing.xl, paddingTop: 10 },
  stepHeadline: {
    fontSize: 24, fontWeight: '800', color: colors.white,
    lineHeight: 32, letterSpacing: 0, marginBottom: 8,
  },
  stepSub: {
    fontSize: 13, color: colors.textMuted, lineHeight: 20, marginBottom: 24,
  },
  optionsWrap: { gap: 10 },

  // Option cards
  optCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16, paddingVertical: 16,
    gap: 14,
  },
  optCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(30,136,229,0.10)',
  },
  optIcon: { fontSize: 22, width: 28, textAlign: 'center' },
  optLabel: { fontSize: 15, fontWeight: '600', color: colors.textMuted, flex: 1 },
  optLabelActive: { color: colors.white },
  optSub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  optCheck: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  optCheckActive: {
    backgroundColor: colors.primary, borderColor: colors.primary,
  },
  optCheckMark: { color: colors.white, fontSize: 12, fontWeight: '700' },

  // Footer CTA
  footer: {
    paddingHorizontal: spacing.xl, paddingBottom: 12,
    paddingTop: 10, gap: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  ctaBtn: {
    backgroundColor: colors.action,
    borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center',
  },
  ctaBtnDisabled: { opacity: 0.35 },
  ctaBtnText: { color: colors.actionText, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  stepCount: { textAlign: 'center', fontSize: 12, color: colors.textFaint },
});
