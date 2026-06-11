import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Pressable, Share, View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { Disclaimer, Header, Card, CardLabel } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { ALL_ZONES, Injection } from '../data/peptides';
import { getInjections } from '../lib/storage';
import { getSiteUsage } from '../lib/sites';

export function AnalyticsScreen() {
  const [injections, setInjections] = useState<Injection[]>([]);
  useEffect(() => { getInjections().then(setInjections); }, []);

  // Compute weekly buckets (last 8 weeks)
  const weeks = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    injections.forEach(i => {
      const d = new Date(i.date);
      const days = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      const week = Math.floor(days / 7);
      if (week >= 0 && week < 8) {
        buckets[7 - week]++;
      }
    });
    return buckets;
  }, [injections]);
  const maxWeek = Math.max(...weeks, 1);

  // Top peptides by usage
  const peptideRanks = useMemo(() => {
    const counts: Record<string, number> = {};
    injections.forEach(i => { counts[i.peptide] = (counts[i.peptide] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [injections]);
  const maxPept = Math.max(...peptideRanks.map(p => p.count), 1);

  // Site usage
  const siteUsage = useMemo(() => {
    const counts = getSiteUsage(injections);
    return ALL_ZONES.map(zone => ({ id: zone.id, name: zone.short, count: counts[zone.id] || 0 }));
  }, [injections]);

  const weights = injections.filter(i => i.weight > 0);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = injections.filter(i => i.date.startsWith(currentMonth));
  const monthDays = new Set(monthRecords.map(i => i.date)).size;
  const monthSites = Object.values(getSiteUsage(monthRecords)).reduce((sum, count) => sum + count, 0);
  const monthTop = Object.entries(
    monthRecords.reduce<Record<string, number>>((counts, record) => {
      counts[record.peptide] = (counts[record.peptide] || 0) + 1;
      return counts;
    }, {})
  ).sort((a, b) => b[1] - a[1])[0];
  const monthLabel = new Date(`${currentMonth}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const reportText = [
    `Monarch Prime Pin Research Record Summary`,
    monthLabel,
    '',
    `Saved records: ${monthRecords.length}`,
    `Active record days: ${monthDays}`,
    `Recorded site selections: ${monthSites}`,
    `Most recorded compound: ${monthTop ? `${monthTop[0]} (${monthTop[1]})` : 'None'}`,
    '',
    'Record lines:',
    ...(monthRecords.length > 0
      ? monthRecords.map(record => `${record.date} ${record.time} | ${record.peptide} | ${record.site}${record.notes ? ` | ${record.notes}` : ''}`)
      : ['No saved records this month']),
    '',
    'For research organization and recordkeeping only.',
  ].join('\n');

  const shareReport = async () => {
    try {
      await Share.share({ message: reportText, title: `${monthLabel} Research Record Summary` });
    } catch (e: any) {
      Alert.alert('Unable to share report', e?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Reports" subtitle="Record summaries and trends" />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Card>
          <CardLabel icon="📄">MONTHLY RECORD SUMMARY</CardLabel>
          <Text style={s.reportMonth}>{monthLabel}</Text>
          <View style={s.reportGrid}>
            <SummaryStat label="Saved Records" value={monthRecords.length} />
            <SummaryStat label="Record Days" value={monthDays} />
            <SummaryStat label="Site Selections" value={monthSites} />
          </View>
          <Text style={s.reportLine}>Most recorded: {monthTop ? `${monthTop[0]} (${monthTop[1]})` : 'No records this month'}</Text>
          <Pressable style={s.shareBtn} onPress={shareReport} accessibilityRole="button" accessibilityLabel="Share monthly record summary">
            <Text style={s.shareBtnText}>Share Record Summary</Text>
          </Pressable>
        </Card>
        <Card>
          <CardLabel icon="📊">WEEKLY INJECTION FREQUENCY</CardLabel>
          <Text style={s.sub}>Last 8 weeks</Text>
          <View style={s.barChart}>
            {weeks.map((v, i) => (
              <View key={i} style={s.barCol}>
                <View style={[s.bar, { height: `${Math.max(2, (v / maxWeek) * 100)}%` }]} />
                <Text style={s.barLabel}>W{8 - i}</Text>
              </View>
            ))}
          </View>
        </Card>

        <Card>
          <CardLabel icon="⚖">WEIGHT TREND</CardLabel>
          {weights.length === 0 ? (
            <Text style={s.empty}>No weight data logged yet</Text>
          ) : (
            <Svg viewBox="0 0 200 60" width="100%" height={80}>
              <Line x1="10" y1="50" x2="190" y2="50" stroke={colors.primary} strokeWidth="0.6" opacity={0.3} />
              <Line x1="10" y1="20" x2="190" y2="20" stroke={colors.primary} strokeWidth="2" />
              <SvgCircle cx="10" cy="20" r="2" fill={colors.primary} />
              <SvgCircle cx="100" cy="20" r="2" fill={colors.primary} />
              <SvgCircle cx="190" cy="20" r="2" fill={colors.primary} />
              <SvgText x="0" y="14" fill={colors.textMuted} fontSize="6">{weights[0].weight} lbs</SvgText>
            </Svg>
          )}
        </Card>

        <Card>
          <CardLabel icon="💊">TOP PEPTIDES USED</CardLabel>
          {peptideRanks.length === 0 ? (
            <Text style={s.empty}>No peptides logged yet</Text>
          ) : peptideRanks.map(p => (
            <View key={p.name} style={s.rankRow}>
              <Text style={s.rankName} numberOfLines={1}>{p.name}</Text>
              <View style={s.rankBarWrap}>
                <View style={[s.rankBar, { width: `${(p.count / maxPept) * 100}%` }]} />
              </View>
              <Text style={s.rankCount}>{p.count}</Text>
            </View>
          ))}
        </Card>

        <Card>
          <CardLabel icon="📍">INJECTION SITE USAGE</CardLabel>
          <View style={s.siteGrid}>
            {siteUsage.map(({ id, name, count }) => (
              <View
                key={id}
                style={[s.siteCell, count >= 3 && s.siteCellActive]}
              >
                <Text style={s.siteCellName}>{name}</Text>
                <Text style={[s.siteCellCount, count > 0 && { color: colors.white }]}>{count}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.summaryStat}>
      <Text style={s.summaryValue}>{value}</Text>
      <Text style={s.summaryLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  sub: { fontSize: 11, color: colors.textMuted, marginTop: -8, marginBottom: 14 },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  reportMonth: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 12 },
  reportGrid: { flexDirection: 'row', gap: 7, marginBottom: 12 },
  summaryStat: { flex: 1, minHeight: 70, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', padding: 7 },
  summaryValue: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  summaryLabel: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 3 },
  reportLine: { color: colors.text, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  shareBtn: { minHeight: 46, backgroundColor: 'rgba(30,136,229,0.15)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  barChart: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 4, paddingVertical: 8 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: 4 },
  bar: { width: '100%', backgroundColor: colors.primary, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
  barLabel: { fontSize: 10, color: colors.textMuted },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rankName: { width: 130, color: colors.white, fontSize: 13 },
  rankBarWrap: { flex: 1, height: 8, backgroundColor: 'rgba(30, 136, 229, 0.1)', borderRadius: 4, overflow: 'hidden' },
  rankBar: { height: '100%', backgroundColor: colors.primary },
  rankCount: { color: colors.textMuted, fontSize: 14, fontWeight: '600', minWidth: 16, textAlign: 'right' },

  siteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  siteCell: {
    width: '23.5%', backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.1)',
    borderRadius: 8, paddingVertical: 10, paddingHorizontal: 6, alignItems: 'center',
  },
  siteCellActive: { backgroundColor: 'rgba(229, 57, 53, 0.15)', borderColor: 'rgba(229, 57, 53, 0.4)' },
  siteCellName: { color: colors.textMuted, fontSize: 10, marginBottom: 4, textAlign: 'center' },
  siteCellCount: { color: colors.textFaint, fontSize: 18, fontWeight: '700' },
});
