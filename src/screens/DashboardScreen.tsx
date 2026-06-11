import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel, ViewPill } from '../components/UI';
import { BodyDiagram } from '../components/BodyDiagram';
import { colors, spacing, radius, severity } from '../theme';
import { useAuth } from '../lib/auth';
import { getInjections } from '../lib/storage';
import { Injection } from '../data/peptides';
import { getSiteDensity } from '../lib/sites';

type Props = {
  onNavigate: (tab: string) => void;
};

function getGreetingName(name?: string, email?: string) {
  const cleaned = name?.trim().replace(/\s+/g, ' ') || '';
  const emailPrefix = email?.split('@')[0]?.toLowerCase();
  if (!cleaned || cleaned.includes('@') || cleaned.toLowerCase() === emailPrefix) {
    return 'Researcher';
  }
  return cleaned.split(' ')[0];
}

export function DashboardScreen({ onNavigate }: Props) {
  const { user } = useAuth();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [injections, setInjections] = useState<Injection[]>([]);
  const [reminderDismissed, setReminderDismissed] = useState(false);

  useEffect(() => {
    getInjections().then(setInjections);
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = injections.filter(i => new Date(i.date) >= weekAgo).length;

    // Count unique days with a saved log. This avoids fake/hard-coded streak numbers.
    const uniqueLogDays = new Set(
      injections
        .map(i => i.date)
        .filter(Boolean)
    ).size;

    return {
      logDays: uniqueLogDays,
      total: injections.length,
      thisWeek,
    };
  }, [injections]);

  const lastInj = injections[0];
  const greetingName = getGreetingName(user?.name, user?.email);
  const siteDensity = useMemo(() => getSiteDensity(injections), [injections]);

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Header
          title={`Hello, ${greetingName}`}
          subtitle={user?.isDeveloper ? 'Developer Mode' : 'Welcome back'}
        />

        <View style={s.statRow}>
          <StatCard icon="🔥" value={stats.logDays} label="Log Days" />
          <StatCard icon="💉" value={stats.total} label="Total Inj." />
          <StatCard icon="📅" value={stats.thisWeek} label="This Week" />
        </View>

        {!reminderDismissed && lastInj && (
          <View style={s.reminderCard}>
            <Pressable onPress={() => setReminderDismissed(true)} style={s.reminderClose}>
              <Text style={s.reminderCloseText}>×</Text>
            </Pressable>
            <View style={s.reminderHeader}>
              <Text style={{ fontSize: 14 }}>⏰</Text>
              <Text style={s.reminderTitle}>Log Review</Text>
            </View>
            <Text style={s.reminderCompound}>{lastInj.peptide}</Text>
            <Text style={s.reminderMeta}>Last logged: {lastInj.date}</Text>
            <Text style={s.reminderMeta}>Last site: {lastInj.site}</Text>
            <View style={s.reminderNext}>
              <Text style={s.reminderNextText}>Review your previous log entry</Text>
            </View>
          </View>
        )}

        <Card>
          <CardLabel icon="📍">SITE HEATMAP</CardLabel>
          <ViewPill view={view} setView={setView} />
          <BodyDiagram view={view} mode="heatmap" densityByZone={siteDensity} />
          <Text style={s.anteriorLabel}>{view === 'front' ? 'ANTERIOR' : 'POSTERIOR'}</Text>
          <View style={s.legend}>
            <LegendDot color={colors.primary} label="Unused" />
            <LegendDot color={colors.teal} label="Light" />
            <LegendDot color={colors.accent} label="Moderate" />
            <LegendDot color={colors.red} label="Heavy" />
          </View>
        </Card>

        {lastInj && (
          <Card>
            <CardLabel icon="💉">LAST INJECTION</CardLabel>
            <Text style={s.lastInjPeptide}>{lastInj.peptide}</Text>
            <Text style={s.lastInjMeta}>
              {lastInj.dose}{lastInj.unit}  ·  {lastInj.date}  ·{' '}
              <Text style={{ color: severity[lastInj.sev] }}>
                {lastInj.sev === 'none' ? 'None' : lastInj.sev === 'mild' ? 'Mild' : lastInj.sev === 'mod' ? 'Moderate' : 'Severe'}
              </Text>
            </Text>
            <Text style={s.lastInjMeta}>Sites: {lastInj.site}</Text>
          </Card>
        )}

        <View style={s.qaRow}>
          <Pressable style={s.qaPrimary} onPress={() => onNavigate('log')}>
            <Text style={s.qaPrimaryText}>💉  Log Injection</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statVal}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  statRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statVal: { color: colors.white, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  reminderCard: {
    marginHorizontal: spacing.xl, marginBottom: 14,
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: radius.lg, padding: 16, paddingTop: 14,
  },
  reminderClose: { position: 'absolute', right: 12, top: 10, zIndex: 2 },
  reminderCloseText: { color: colors.textMuted, fontSize: 24, lineHeight: 24 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reminderTitle: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  reminderCompound: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  reminderMeta: { color: colors.text, fontSize: 13, marginBottom: 2 },
  reminderNext: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  reminderNextText: { color: colors.textMuted, fontSize: 13 },

  anteriorLabel: { textAlign: 'center', color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 3, marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 11 },

  lastInjPeptide: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lastInjMeta: { color: colors.text, fontSize: 13, lineHeight: 20 },

  qaRow: { paddingHorizontal: spacing.xl, marginTop: 2, marginBottom: 14 },
  qaPrimary: {
    backgroundColor: colors.action, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center',
  },
  qaPrimaryText: { color: colors.actionText, fontSize: 15, fontWeight: '700' },
});
