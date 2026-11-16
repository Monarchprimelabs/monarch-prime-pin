import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Card, Disclaimer } from '../components/UI';
import { ShellHeader } from '../components/FormKit';
import { GlassSheen, PressableScale, Reveal } from '../components/Glass';
import { colors, radius, spacing, withAlpha } from '../theme';
import { useI18n } from '../lib/i18n';
import { useWideLayout } from '../lib/layout';
import { COMPOUNDS } from './content';
import { TOPICS, Topic } from './topics';
import { EVIDENCE_ORDER, EvidenceLevel, LearnCompound, Source } from './types';

// The Learn library (web app only): what published research says about
// common compounds, graded by strength of evidence, every claim linked to its
// source. It describes studies; it never recommends a compound or an amount.

type LearnView = { kind: 'home' } | { kind: 'topic'; topic: Topic } | { kind: 'compound'; compound: LearnCompound };

const LEVEL_COLOR: Record<EvidenceLevel, string> = {
  'Approved drug (human RCTs)': '#34D399',
  'Human clinical trials (limited)': '#29ABE2',
  'Mostly animal studies': '#F5871F',
  'In vitro / very early': '#9AA5B8',
};
const LEVEL_KEY: Record<EvidenceLevel, string> = {
  'Approved drug (human RCTs)': 'learn.level.approved',
  'Human clinical trials (limited)': 'learn.level.human',
  'Mostly animal studies': 'learn.level.animal',
  'In vitro / very early': 'learn.level.early',
};

const strength = (level: EvidenceLevel) => EVIDENCE_ORDER.length - EVIDENCE_ORDER.indexOf(level);
const byEvidence = (a: LearnCompound, b: LearnCompound) =>
  EVIDENCE_ORDER.indexOf(a.evidenceLevel) - EVIDENCE_ORDER.indexOf(b.evidenceLevel) || a.name.localeCompare(b.name);

function subjectKind(subjects: string): 'human' | 'animal' | 'lab' {
  const s = subjects.toLowerCase();
  if (s.includes('human')) return 'human';
  if (s.includes('vitro') || s.includes('cell')) return 'lab';
  return 'animal';
}

/** Four bars that fill to the strength of the evidence. */
function EvidenceMeter({ level, large }: { level: EvidenceLevel; large?: boolean }) {
  const reduce = useReducedMotion();
  const filled = strength(level);
  const color = LEVEL_COLOR[level];
  return (
    <View style={[s.meter, large && s.meterLarge]} accessibilityLabel={level}>
      {[1, 2, 3, 4].map(i => <MeterBar key={i} on={i <= filled} color={color} delay={i * 90} reduce={reduce} large={large} />)}
    </View>
  );
}

function MeterBar({ on, color, delay, reduce, large }: { on: boolean; color: string; delay: number; reduce: boolean; large?: boolean }) {
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) p.value = withDelay(delay + 150, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const fill = useAnimatedStyle(() => ({ transform: [{ scaleX: on ? p.value : 0 }] }));
  return (
    <View style={[s.bar, large && s.barLarge]}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: color, transformOrigin: 'left' }, fill]} />
    </View>
  );
}

function SourceLink({ source }: { source: Source }) {
  const where = [source.journal ?? source.publisher, source.year].filter(Boolean).join(', ');
  return (
    // A real <a target="_blank"> on web, so the link opens even where pop-ups are restricted.
    <Pressable {...({ href: source.url, hrefAttrs: { target: '_blank', rel: 'noopener noreferrer' } } as object)} accessibilityRole="link" style={s.source}>
      <Text style={s.sourceText} numberOfLines={2}>{source.title}{where ? ` · ${where}` : ''}</Text>
      <Ionicons name="open-outline" size={13} color={colors.primary} />
    </Pressable>
  );
}

export function LearnScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const wide = useWideLayout();
  const [view, setView] = useState<LearnView>({ kind: 'home' });
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? COMPOUNDS.filter(c => [c.name, ...c.aliases, c.category].some(v => v.toLowerCase().includes(q)))
      : COMPOUNDS;
    return [...list].sort(byEvidence);
  }, [query]);

  const back = () => (view.kind === 'home' ? onClose() : setView({ kind: 'home' }));
  const title = view.kind === 'compound' ? view.compound.name : view.kind === 'topic' ? t(view.topic.titleKey) : t('learn.title');

  return (
    <SafeAreaView style={s.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <ShellHeader title={title} backLabel={view.kind === 'home' ? t('settings.backToTools') : t('learn.back')} onBack={back} />
      <ScrollView key={view.kind === 'compound' ? view.compound.id : view.kind === 'topic' ? view.topic.id : 'home'} contentContainerStyle={[s.content, wide && s.contentWide]}>
        {view.kind === 'home' && (
          <>
            <Reveal style={s.hero}>
              <GlassSheen radius={radius.xl} />
              <Text style={s.eyebrow}>{t('learn.eyebrow')}</Text>
              <Text style={s.heroTitle}>{t('learn.heroTitle')}</Text>
              <Text style={s.heroBody}>{t('learn.heroBody')}</Text>
            </Reveal>
            <Notice />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('learn.search')}
              placeholderTextColor={colors.textFaint}
              style={s.search}
              accessibilityLabel={t('learn.search')}
            />
            {!query && (
              <>
                <Text style={s.section}>{t('learn.byTopic')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.topicRow}>
                  {TOPICS.filter(tp => COMPOUNDS.some(c => c.topics.includes(tp.id))).map(tp => (
                    <PressableScale key={tp.id} style={s.topicCard} onPress={() => setView({ kind: 'topic', topic: tp })} accessibilityRole="button">
                      <GlassSheen radius={radius.lg} />
                      <View style={s.topicIcon}><Ionicons name={tp.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.primary} /></View>
                      <Text style={s.topicTitle}>{t(tp.titleKey)}</Text>
                      <Text style={s.topicCount}>{t('learn.compoundCount', { n: COMPOUNDS.filter(c => c.topics.includes(tp.id)).length })}</Text>
                    </PressableScale>
                  ))}
                </ScrollView>
                <Legend />
              </>
            )}
            <Text style={s.section}>{query ? t('learn.results', { n: filtered.length }) : t('learn.allCompounds')}</Text>
            <CompoundGrid list={filtered} onOpen={c => setView({ kind: 'compound', compound: c })} wide={wide} />
          </>
        )}

        {view.kind === 'topic' && (
          <>
            <Reveal style={s.hero}>
              <GlassSheen radius={radius.xl} />
              <Text style={s.heroTitle}>{t(view.topic.titleKey)}</Text>
              <Text style={s.heroBody}>{t(view.topic.blurbKey)}</Text>
              <Text style={s.caveat}>{t('learn.topicCaveat')}</Text>
            </Reveal>
            <CompoundGrid
              list={COMPOUNDS.filter(c => c.topics.includes(view.topic.id)).sort(byEvidence)}
              onOpen={c => setView({ kind: 'compound', compound: c })}
              wide={wide}
            />
          </>
        )}

        {view.kind === 'compound' && <CompoundDetail c={view.compound} onTopic={tp => setView({ kind: 'topic', topic: tp })} />}

        <Text style={s.footer}>{t('learn.footer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Notice() {
  const { t } = useI18n();
  return (
    <View style={s.notice}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.accent} />
      <Text style={s.noticeText}>{t('learn.notice')}</Text>
    </View>
  );
}

function Legend() {
  const { t } = useI18n();
  return (
    <Card>
      <Text style={s.legendTitle}>{t('learn.legendTitle')}</Text>
      {EVIDENCE_ORDER.map(level => (
        <View key={level} style={s.legendRow}>
          <EvidenceMeter level={level} />
          <Text style={s.legendText}>{t(LEVEL_KEY[level])}</Text>
        </View>
      ))}
    </Card>
  );
}

function CompoundGrid({ list, onOpen, wide }: { list: LearnCompound[]; onOpen: (c: LearnCompound) => void; wide: boolean }) {
  const { t } = useI18n();
  if (list.length === 0) return <Text style={s.empty}>{t('learn.noResults')}</Text>;
  return (
    <View style={[s.grid, wide && s.gridWide]}>
      {list.map(c => (
        <Reveal key={c.id} style={wide ? s.gridItemWide : undefined}>
          <PressableScale style={s.compoundCard} onPress={() => onOpen(c)} accessibilityRole="button" accessibilityLabel={c.name}>
            <GlassSheen radius={radius.lg} />
            <View style={s.cardTop}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.cardName}>{c.name}</Text>
                <Text style={s.cardCategory}>{c.category}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </View>
            <EvidenceMeter level={c.evidenceLevel} />
            <Text style={[s.cardLevel, { color: LEVEL_COLOR[c.evidenceLevel] }]}>{t(LEVEL_KEY[c.evidenceLevel])}</Text>
          </PressableScale>
        </Reveal>
      ))}
    </View>
  );
}

function CompoundDetail({ c, onTopic }: { c: LearnCompound; onTopic: (t: Topic) => void }) {
  const { t } = useI18n();
  const SUBJECT = {
    human: { key: 'learn.subject.human', color: '#34D399' },
    animal: { key: 'learn.subject.animal', color: '#F5871F' },
    lab: { key: 'learn.subject.lab', color: '#9AA5B8' },
  } as const;
  return (
    <>
      <Reveal style={s.hero}>
        <GlassSheen radius={radius.xl} />
        <Text style={s.eyebrow}>{c.category}</Text>
        <Text style={s.heroTitle}>{c.name}</Text>
        {c.aliases.length > 0 && <Text style={s.aliases}>{t('learn.alsoCalled', { names: c.aliases.join(', ') })}</Text>}
        <View style={s.levelRow}>
          <EvidenceMeter level={c.evidenceLevel} large />
          <Text style={[s.levelText, { color: LEVEL_COLOR[c.evidenceLevel] }]}>{t(LEVEL_KEY[c.evidenceLevel])}</Text>
        </View>
        <Text style={s.heroBody}>{c.summary}</Text>
        <View style={s.chips}>
          {c.topics.map(id => TOPICS.find(tp => tp.id === id)).filter((tp): tp is Topic => !!tp).map(tp => (
            <Pressable key={tp.id} style={s.chip} onPress={() => onTopic(tp)} accessibilityRole="button">
              <Text style={s.chipText}>{t(tp.titleKey)}</Text>
            </Pressable>
          ))}
        </View>
      </Reveal>

      <Card>
        <Text style={s.cardHeading}>{t('learn.regulatory')}</Text>
        <Text style={s.body}>{c.fdaStatus.text}</Text>
        <SourceLink source={c.fdaStatus.source} />
        {c.fdaStatus.more?.map(m => <SourceLink key={m.url} source={m} />)}
        {!!c.wadaStatus && (
          <>
            <Text style={[s.body, { marginTop: 10 }]}>{c.wadaStatus.text}</Text>
            <SourceLink source={c.wadaStatus.source} />
            {c.wadaStatus.more?.map(m => <SourceLink key={m.url} source={m} />)}
          </>
        )}
      </Card>

      <Card>
        <Text style={s.cardHeading}>{t('learn.findings')}</Text>
        {c.findings.map((f, i) => {
          const kind = SUBJECT[subjectKind(f.subjects)];
          return (
            <View key={i} style={[s.finding, i > 0 && s.findingSep]}>
              <View style={s.findingTags}>
                <Text style={[s.tag, { color: kind.color, borderColor: withAlpha(kind.color, 0.5) }]}>{t(kind.key)}</Text>
                <Text style={s.design}>{f.design}</Text>
              </View>
              <Text style={s.body}>{f.text}</Text>
              <SourceLink source={f.source} />
            </View>
          );
        })}
      </Card>

      {c.risks.length > 0 && (
        <Card>
          <Text style={s.cardHeading}>{t('learn.risks')}</Text>
          {c.risks.map((r, i) => (
            <View key={i} style={[s.finding, i > 0 && s.findingSep]}>
              <Text style={s.body}>{r.text}</Text>
              <SourceLink source={r.source} />
            </View>
          ))}
        </Card>
      )}

      {c.unknowns.length > 0 && (
        <Card>
          <Text style={s.cardHeading}>{t('learn.unknowns')}</Text>
          {c.unknowns.map((u, i) => <Text key={i} style={[s.body, s.bullet]}>•  {u}</Text>)}
        </Card>
      )}
      <Notice />
    </>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 60 },
  contentWide: { width: '100%', maxWidth: 1100, alignSelf: 'center' },
  hero: {
    marginHorizontal: spacing.xl, marginTop: spacing.lg, marginBottom: spacing.lg, padding: 20, borderRadius: radius.xl,
    backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassBorder, borderTopColor: colors.hairline,
  },
  eyebrow: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 6 },
  heroTitle: { color: colors.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  heroBody: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 10 },
  caveat: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 10 },
  aliases: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  notice: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    padding: 14, borderRadius: radius.lg, backgroundColor: withAlpha(colors.accent, 0.1), borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderOrange,
  },
  noticeText: { flex: 1, color: colors.accentLight, fontSize: 13, lineHeight: 19 },
  search: {
    marginHorizontal: spacing.xl, marginBottom: spacing.lg, paddingHorizontal: 16, paddingVertical: 13, borderRadius: radius.lg,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 15,
  },
  section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginHorizontal: spacing.xl, marginBottom: 10 },
  topicRow: { paddingHorizontal: spacing.xl, gap: 10, paddingBottom: spacing.lg },
  topicCard: {
    width: 150, padding: 14, borderRadius: radius.lg, gap: 6,
    backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassBorder,
  },
  topicIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.15) },
  topicTitle: { color: colors.white, fontSize: 15, fontWeight: '700' },
  topicCount: { color: colors.textMuted, fontSize: 12 },
  legendTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 5 },
  legendText: { color: colors.text, fontSize: 13, flex: 1 },
  grid: { paddingHorizontal: spacing.xl, gap: 10, marginBottom: spacing.lg },
  gridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  gridItemWide: { width: '48.5%' },
  compoundCard: {
    padding: 16, borderRadius: radius.lg, gap: 8,
    backgroundColor: colors.bgCard, borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.glassBorder, borderTopColor: colors.hairline,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { color: colors.white, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  cardCategory: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  cardLevel: { fontSize: 12, fontWeight: '700' },
  meter: { flexDirection: 'row', gap: 4, width: 92 },
  meterLarge: { width: 140, gap: 5 },
  bar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: withAlpha(colors.text, 0.12) },
  barLarge: { height: 9, borderRadius: 5 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  levelText: { fontSize: 14, fontWeight: '800', flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: withAlpha(colors.primary, 0.14), borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.primary, 0.5) },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  cardHeading: { color: colors.white, fontSize: 17, fontWeight: '800', marginBottom: 10 },
  body: { color: colors.text, fontSize: 14, lineHeight: 21 },
  bullet: { marginBottom: 6 },
  finding: { paddingVertical: 10 },
  findingSep: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  findingTags: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  tag: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.sm, borderWidth: 1, overflow: 'hidden' },
  design: { color: colors.textMuted, fontSize: 12 },
  source: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  sourceText: { color: colors.primary, fontSize: 12, flex: 1 },
  empty: { color: colors.textMuted, fontSize: 14, marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  footer: { color: colors.textFaint, fontSize: 11, lineHeight: 16, textAlign: 'center', marginHorizontal: spacing.xl, marginTop: spacing.lg },
});
