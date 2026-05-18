import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel, ViewPill } from '../components/UI';
import { BodyDiagram } from '../components/BodyDiagram';
import { colors, spacing, radius, severity } from '../theme';
import { useAuth } from '../lib/auth';
import { getInjections } from '../lib/storage';
import { Injection } from '../data/peptides';

type Props = {
  onNavigate: (tab: string) => void;
};

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
    return {
      streak: injections.length > 0 ? 14 : 0,
      total: injections.length,
      thisWeek,
    };
  }, [injections]);

  const lastInj = injections[0];

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Header
          title={`Hello, ${user?.name || 'Researcher'}`}
          subtitle={user?.isGuest ? 'Demo Mode' : user?.isDeveloper ? 'Developer Mode' : 'Welcome back'}
        />

        <View style={s.statRow}>
          <StatCard icon="🔥" value={stats.streak} label="Day Streak" />
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
              <Text style={s.reminderTitle}>Smart Reminder</Text>
            </View>
            <Text style={s.reminderCompound}>{lastInj.peptide}</Text>
            <Text style={s.reminderMeta}>Last injection: {lastInj.date}</Text>
            <Text style={s.reminderMeta}>Last site: {lastInj.site}</Text>
            <View style={s.reminderNext}>
              <Text style={s.reminderNextText}>
                Next dose due in <Text style={s.reminderNextStrong}>22h 14m</Text>
              </Text>
            </View>
          </View>
        )}

        <Card>
          <CardLabel icon="📍">SITE HEATMAP</CardLabel>
          <ViewPill view={view} setView={setView} />
          <BodyDiagram view={view} mode="heatmap" />
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
          <Pressable style={s.qaSecondary} onPress={() => onNavigate('ai')}>
            <Text style={s.qaSecondaryText}>🧠  Ask AI</Text>
          </Pressable>
        </View>

        <Card>
          <CardLabel icon="📋">RETATRUTIDE TITRATION PROTOCOL</CardLabel>
          {[
            { phase: 1, weeks: '1-4',  dose: '0.5 mg', note: 'Initiation',   current: false },
            { phase: 2, weeks: '5-8',  dose: '1.0 mg', note: 'Escalation',   current: true  },
            { phase: 3, weeks: '9-12', dose: '2.0 mg', note: 'Maintenance',  current: false },
            { phase: 4, weeks: '13+',  dose: '4.0 mg', note: 'Optimization', current: false },
          ].map(p => (
            <View key={p.phase} style={[s.phaseRow, p.current && s.phaseRowActive]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[s.phaseTitle, { color: p.current ? colors.accent : colors.white }]}>
                    Phase {p.phase}
                  </Text>
                  {p.current && (
                    <View style={s.currentBadge}>
                      <Text style={s.currentBadgeText}>CURRENT</Text>
                    </View>
                  )}
                </View>
                <Text style={s.phaseWeeks}>Weeks {p.weeks}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[s.phaseDose, { color: p.current ? colors.accent : colors.primary }]}>
                  {p.dose}
                </Text>
                <Text style={s.phaseNote}>{p.note}</Text>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={s.statCard}>
      <Text style={s.statIcon}>{icon}</Text>
      <Text style={s.statValue}>{value}</Text>
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
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  statCard: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingVertical: 14, paddingHorizontal: 8, alignItems: 'center',
  },
  statIcon: { fontSize: 22, marginBottom: 6 },
  statValue: { fontSize: 28, fontWeight: '700', color: colors.primary, lineHeight: 28, marginBottom: 6 },
  statLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  reminderCard: {
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.25)',
    borderRadius: radius.lg, padding: 16, paddingTop: 14,
  },
  reminderClose: { position: 'absolute', top: 6, right: 8, padding: 8, zIndex: 1 },
  reminderCloseText: { color: colors.textMuted, fontSize: 22, lineHeight: 22 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reminderTitle: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  reminderCompound: { color: colors.white, fontSize: 19, fontWeight: '700', marginBottom: 4 },
  reminderMeta: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  reminderNext: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 140, 0, 0.15)' },
  reminderNextText: { fontSize: 12, color: '#C8D4E6' },
  reminderNextStrong: { color: colors.gold, fontWeight: '700' },

  anteriorLabel: { textAlign: 'center', color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 3, marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#C8D4E6' },

  lastInjPeptide: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lastInjMeta: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },

  qaRow: { flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  qaPrimary: {
    flex: 1, backgroundColor: colors.primary, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  qaPrimaryText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  qaSecondary: {
    flex: 1, backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center',
  },
  qaSecondaryText: { color: colors.white, fontSize: 15, fontWeight: '600' },

  phaseRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint,
  },
  phaseRowActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderRadius: 8, paddingHorizontal: 10, borderBottomWidth: 0,
  },
  phaseTitle: { fontSize: 15, fontWeight: '700' },
  phaseWeeks: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  phaseDose: { fontSize: 17, fontWeight: '700' },
  phaseNote: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 2, backgroundColor: colors.accent, borderRadius: 4 },
  currentBadgeText: { fontSize: 9, color: colors.white, letterSpacing: 1, fontWeight: '700' },
});
