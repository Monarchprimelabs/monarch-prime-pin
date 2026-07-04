import React, { useEffect, useState, useMemo } from 'react';
import { Alert, Pressable, Share, View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle as SvgCircle, Polyline, Text as SvgText } from 'react-native-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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

  // Dose history for one compound at a time — factual record of what was
  // logged, normalized to mcg internally for a consistent axis.
  const [doseCompound, setDoseCompound] = useState<string | null>(null);
  const compoundOptions = peptideRanks.map(rank => rank.name);
  const activeCompound = doseCompound && compoundOptions.includes(doseCompound)
    ? doseCompound
    : compoundOptions[0] ?? null;

  const doseChart = useMemo(() => {
    if (!activeCompound) return null;
    const series = injections
      .filter(record => record.peptide === activeCompound)
      .map(record => ({
        stamp: `${record.date}T${record.time}`,
        mcg: (Number(String(record.dose).replace(',', '.')) || 0) * (record.unit === 'mg' ? 1000 : 1),
      }))
      .filter(point => point.mcg > 0)
      .sort((a, b) => a.stamp.localeCompare(b.stamp))
      .slice(-30);
    if (series.length < 2) return { count: series.length, latest: series[0]?.mcg ?? 0, points: null as null | { cx: number; cy: number }[], polyline: '', min: 0, max: 0 };
    const values = series.map(point => point.mcg);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (index: number) => 12 + (index / (values.length - 1)) * 176;
    const y = (mcg: number) => 48 - ((mcg - min) / span) * 36;
    return {
      count: values.length,
      latest: values[values.length - 1],
      min,
      max,
      points: values.map((mcg, index) => ({ cx: x(index), cy: y(mcg) })),
      polyline: values.map((mcg, index) => `${x(index)},${y(mcg)}`).join(' '),
    };
  }, [activeCompound, injections]);

  // Frequency of self-reported symptom tags across all records.
  const symptomRanks = useMemo(() => {
    const counts: Record<string, number> = {};
    injections.forEach(record => {
      (record.symptoms || []).forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [injections]);
  const maxSymptom = Math.max(...symptomRanks.map(rank => rank.count), 1);

  // Site usage
  const siteUsage = useMemo(() => {
    const counts = getSiteUsage(injections);
    return ALL_ZONES.map(zone => ({ id: zone.id, name: zone.short, count: counts[zone.id] || 0 }));
  }, [injections]);

  // Chronological weight series (oldest → newest), capped to the most
  // recent 30 entries so the chart stays readable.
  const weightSeries = useMemo(() => {
    const entries = injections
      .filter(i => i.weight > 0)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
    return entries.slice(-30);
  }, [injections]);

  const weightChart = useMemo(() => {
    if (weightSeries.length < 2) return null;
    const values = weightSeries.map(w => w.weight);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1; // flat series still renders mid-chart
    const x = (index: number) => 12 + (index / (weightSeries.length - 1)) * 176;
    const y = (weight: number) => 48 - ((weight - min) / span) * 36;
    return {
      min,
      max,
      first: values[0],
      last: values[values.length - 1],
      points: values.map((weight, index) => ({ cx: x(index), cy: y(weight) })),
      polyline: values.map((weight, index) => `${x(index)},${y(weight)}`).join(' '),
    };
  }, [weightSeries]);
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

  const [buildingPdf, setBuildingPdf] = useState(false);
  const sharePdfReport = async () => {
    if (buildingPdf) return;
    setBuildingPdf(true);
    try {
      const esc = (value: unknown) => String(value ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      const rows = monthRecords
        .map(record => `<tr><td>${esc(record.date)} ${esc(record.time)}</td><td>${esc(record.peptide)}</td><td>${esc(record.dose)}${esc(record.unit)}</td><td>${esc(record.site)}</td><td>${esc(severityLabelPdf(record.sev))}</td></tr>`)
        .join('');
      const html = `
        <html><head><meta charset="utf-8"><style>
          body { font-family: -apple-system, Helvetica, sans-serif; color: #111; padding: 28px; }
          h1 { font-size: 20px; margin: 0 0 2px; } h2 { font-size: 14px; color: #555; font-weight: 400; margin: 0 0 18px; }
          .stats { display: flex; gap: 24px; margin-bottom: 18px; }
          .stat b { display: block; font-size: 18px; } .stat span { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ccc; padding: 5px 7px; text-align: left; }
          th { background: #f0f2f5; }
          .foot { margin-top: 20px; font-size: 9px; color: #777; }
        </style></head><body>
          <h1>Monarch Prime Pin — Research Record Summary</h1>
          <h2>${esc(monthLabel)}</h2>
          <div class="stats">
            <div class="stat"><b>${monthRecords.length}</b><span>Saved records</span></div>
            <div class="stat"><b>${monthDays}</b><span>Active record days</span></div>
            <div class="stat"><b>${monthSites}</b><span>Site selections</span></div>
            <div class="stat"><b>${esc(monthTop ? `${monthTop[0]} (${monthTop[1]})` : 'None')}</b><span>Most recorded</span></div>
          </div>
          <table>
            <tr><th>Date</th><th>Compound</th><th>Dose</th><th>Sites</th><th>Side effects</th></tr>
            ${rows || '<tr><td colspan="5">No saved records this month</td></tr>'}
          </table>
          <p class="foot">All values were entered by the user. For research organization and recordkeeping only — not medical advice. Generated ${esc(new Date().toISOString().slice(0, 10))}.</p>
          <p class="foot">Tracked with Monarch Prime Pin — private, on-device peptide recordkeeping. apps.apple.com/app/id6770808426</p>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) throw new Error('Sharing is not available on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `${monthLabel} Record Summary`, UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      Alert.alert('Unable to create PDF', e?.message || 'Please try again.');
    } finally {
      setBuildingPdf(false);
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
          <Pressable
            style={[s.pdfBtn, buildingPdf && { opacity: 0.5 }]}
            disabled={buildingPdf}
            onPress={sharePdfReport}
            accessibilityRole="button"
            accessibilityLabel="Share monthly summary as PDF"
          >
            <Text style={s.pdfBtnText}>{buildingPdf ? 'Preparing PDF…' : 'Share as PDF'}</Text>
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
          {weightSeries.length === 0 ? (
            <Text style={s.empty}>No weight data logged yet</Text>
          ) : !weightChart ? (
            <Text style={s.empty}>
              Latest entry: {weightSeries[0].weight} lbs. Log weight on more records to see a trend.
            </Text>
          ) : (
            <>
              <View style={s.weightSummaryRow}>
                <Text style={s.weightLatest}>{weightChart.last} lbs</Text>
                <Text style={s.weightDelta}>
                  {weightChart.last === weightChart.first
                    ? 'No change since first entry'
                    : `${weightChart.last > weightChart.first ? '+' : ''}${Math.round((weightChart.last - weightChart.first) * 10) / 10} lbs since first entry`}
                </Text>
              </View>
              <Svg viewBox="0 0 200 60" width="100%" height={90}>
                <Line x1="12" y1="12" x2="188" y2="12" stroke={colors.primary} strokeWidth="0.4" opacity={0.25} />
                <Line x1="12" y1="48" x2="188" y2="48" stroke={colors.primary} strokeWidth="0.4" opacity={0.25} />
                <SvgText x="2" y="14" fill={colors.textMuted} fontSize="5">{weightChart.max}</SvgText>
                <SvgText x="2" y="50" fill={colors.textMuted} fontSize="5">{weightChart.min}</SvgText>
                <Polyline
                  points={weightChart.polyline}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {weightChart.points.map((point, index) => (
                  <SvgCircle key={index} cx={point.cx} cy={point.cy} r="1.6" fill={colors.primary} />
                ))}
              </Svg>
              <Text style={s.weightRangeNote}>
                Last {weightSeries.length} weight entries · range {weightChart.min}–{weightChart.max} lbs
              </Text>
            </>
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

        {compoundOptions.length > 0 && (
          <Card>
            <CardLabel icon="📈">DOSE HISTORY</CardLabel>
            <View style={s.chipRow}>
              {compoundOptions.map(name => (
                <Pressable
                  key={name}
                  onPress={() => setDoseCompound(name)}
                  style={[s.chip, activeCompound === name && s.chipActive]}
                >
                  <Text style={[s.chipText, activeCompound === name && s.chipTextActive]} numberOfLines={1}>{name}</Text>
                </Pressable>
              ))}
            </View>
            {!doseChart || doseChart.count === 0 ? (
              <Text style={s.empty}>No dose amounts recorded for this compound yet</Text>
            ) : !doseChart.points ? (
              <Text style={s.empty}>
                Latest recorded dose: {formatDose(doseChart.latest)}. Log more entries to see the history line.
              </Text>
            ) : (
              <>
                <View style={s.weightSummaryRow}>
                  <Text style={s.weightLatest}>{formatDose(doseChart.latest)}</Text>
                  <Text style={s.weightDelta}>latest recorded dose</Text>
                </View>
                <Svg viewBox="0 0 200 60" width="100%" height={90}>
                  <Line x1="12" y1="12" x2="188" y2="12" stroke={colors.primary} strokeWidth="0.4" opacity={0.25} />
                  <Line x1="12" y1="48" x2="188" y2="48" stroke={colors.primary} strokeWidth="0.4" opacity={0.25} />
                  <SvgText x="2" y="14" fill={colors.textMuted} fontSize="5">{formatDose(doseChart.max)}</SvgText>
                  <SvgText x="2" y="50" fill={colors.textMuted} fontSize="5">{formatDose(doseChart.min)}</SvgText>
                  <Polyline
                    points={doseChart.polyline}
                    fill="none"
                    stroke={colors.teal}
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {doseChart.points.map((point, index) => (
                    <SvgCircle key={index} cx={point.cx} cy={point.cy} r="1.6" fill={colors.teal} />
                  ))}
                </Svg>
                <Text style={s.weightRangeNote}>
                  Last {doseChart.count} recorded doses of {activeCompound}. History of your own entries only.
                </Text>
              </>
            )}
          </Card>
        )}

        {symptomRanks.length > 0 && (
          <Card>
            <CardLabel icon="📋">REPORTED SYMPTOMS</CardLabel>
            <Text style={s.sub}>How often each self-reported symptom tag appears in your records</Text>
            {symptomRanks.map(rank => (
              <View key={rank.name} style={s.rankRow}>
                <Text style={s.rankName} numberOfLines={1}>{rank.name}</Text>
                <View style={s.rankBarWrap}>
                  <View style={[s.rankBar, { width: `${(rank.count / maxSymptom) * 100}%`, backgroundColor: colors.accent }]} />
                </View>
                <Text style={s.rankCount}>{rank.count}</Text>
              </View>
            ))}
          </Card>
        )}

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

function severityLabelPdf(value: string): string {
  return value === 'none' ? 'None' : value === 'mild' ? 'Mild' : value === 'mod' ? 'Moderate' : 'Severe';
}

function formatDoseNumber(value: number): string {
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 100 ? 1 : abs >= 1 ? 2 : 3;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

function formatDose(mcg: number): string {
  return mcg >= 1000 ? `${formatDoseNumber(mcg / 1000)} mg` : `${formatDoseNumber(mcg)} mcg`;
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
  weightSummaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' },
  weightLatest: { color: colors.white, fontSize: 22, fontWeight: '700' },
  weightDelta: { color: colors.textMuted, fontSize: 12 },
  weightRangeNote: { color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    maxWidth: '48%', backgroundColor: colors.bgInput, borderWidth: 1,
    borderColor: colors.borderSubtle, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  chipActive: { borderColor: colors.teal, backgroundColor: 'rgba(20,184,166,0.12)' },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: colors.teal },
  shareBtn: { minHeight: 46, backgroundColor: colors.action, borderWidth: 1, borderColor: colors.borderOrange, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { color: colors.actionText, fontSize: 13, fontWeight: '700' },
  pdfBtn: {
    minHeight: 44, marginTop: 8, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  pdfBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

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
