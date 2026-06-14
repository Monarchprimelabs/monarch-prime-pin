import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandMark } from '../components/UI';
import { colors, radius, spacing } from '../theme';
import { setOnboardingDone } from '../lib/storage';

type MultiItem = { id: string; label: string; icon: string };
type SingleItem = { id: string; label: string; icon: string; sub?: string };

// ── Step data ────────────────────────────────────────────────
const TRACK_OPTIONS: MultiItem[] = [
  { id: 'compounds',     label: 'Compound List',      icon: '🧪' },
  { id: 'logs',          label: 'Log Entries',        icon: '📋' },
  { id: 'notes',         label: 'Observation Notes',  icon: '📝' },
  { id: 'inventory',     label: 'Inventory',          icon: '📦' },
  { id: 'photos',        label: 'Progress Photos',    icon: '📷' },
  { id: 'reminders',     label: 'Reminders',          icon: '🔔' },
  { id: 'references',    label: 'Reference Notes',    icon: '🗂️' },
];

const GOAL_OPTIONS: SingleItem[] = [
  { id: 'consistent', label: 'Stay Consistent',       icon: '✅', sub: 'Make logging easier to keep up with' },
  { id: 'history',    label: 'Find Past Entries',     icon: '🕘', sub: 'Look back without digging around' },
  { id: 'inventory',  label: 'Keep Inventory Clear',  icon: '📦', sub: 'Know what is on hand at a glance' },
  { id: 'sites',      label: 'Review Site History',   icon: '📍', sub: 'Keep location records easy to scan' },
  { id: 'photos',     label: 'Keep Photo Records',    icon: '📷', sub: 'Organize visual progress entries' },
  { id: 'summaries',  label: 'Review Summaries',      icon: '📊', sub: 'See clean overviews when needed' },
];

const TOTAL_STEPS = 3;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
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
                headline="What should feel easier first?"
                sub="Choose the workflow you want Monarch to simplify."
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
                headline="What do you want close at hand?"
                sub="Choose what you want to track. You can start logging immediately."
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
                {step === TOTAL_STEPS - 1 ? "Let's Go" : 'Continue'}
              </Text>
            </Pressable>
            <Text style={s.stepCount}>{step} of {TOTAL_STEPS - 1}</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Welcome (step 0) ─────────────────────────────────────────
function WelcomeStep({ onStart }: { onStart: () => void }) {
  return (
    <View style={s.welcomeRoot}>
      <View style={s.welcomeLogoWrap}>
        <BrandMark large />
      </View>

      <View style={s.welcomeBody}>
        <Text style={s.welcomeEyebrow}>MONARCH PRIME PIN</Text>
        <Text style={s.welcomeHeadline}>Private peptide tracking,{'\n'}without the clutter.</Text>
        <Text style={s.welcomeSub}>
          Start with free core tracking. Build a complete history, review site rotation, and keep your records on your device.
        </Text>

        <View style={s.featureList}>
          {[
            { icon: '📋', text: 'Manual research log entries' },
            { icon: '📍', text: 'Site history and rotation heatmap' },
            { icon: '🕘', text: 'Complete history and calendar' },
            { icon: '◆', text: 'Optional Lifetime Pro, no forced monthly plan' },
          ].map(f => (
            <View key={f.text} style={s.featureRow}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.welcomeFooter}>
        <Pressable style={s.ctaBtn} onPress={onStart}>
          <Text style={s.ctaBtnText}>Get Started</Text>
        </Pressable>
        <Text style={s.complianceNote}>
          Core tracking stays free.{'\n'}For research organization only. Not medical advice.
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
            <Text style={[s.optLabel, active && s.optLabelActive]}>{opt.label}</Text>
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
              <Text style={[s.optLabel, active && s.optLabelActive]}>{opt.label}</Text>
              {!!opt.sub && <Text style={s.optSub}>{opt.sub}</Text>}
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
