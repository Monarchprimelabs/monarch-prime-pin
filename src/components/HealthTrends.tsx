import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { Card, CardLabel } from './UI';
import { colors, radius } from '../theme';
import { useI18n } from '../lib/i18n';
import { expandedHealthAsked, ExpandedHealth, HealthPoint, readExpandedHealth, requestExpandedHealth } from '../lib/health';
import { recentMean } from '../lib/healthMath';
import { localDateISO } from '../lib/dates';

/**
 * Expanded Apple Health trends (Premium, iOS). Read live each time and never
 * stored. Apple's permission sheet appears only after the user taps Connect.
 * Descriptive only: latest value and 30/90-day averages.
 */
export function HealthTrendsCard({ onSleep }: { onSleep?: (sleepByDay: Record<string, number>) => void }) {
  const { t } = useI18n();
  const [asked, setAsked] = useState<boolean | null>(null);
  const [data, setData] = useState<ExpandedHealth | null>(null);

  const load = async () => {
    const result = await readExpandedHealth(90);
    setData(result);
    onSleep?.(result.sleepByDay);
  };

  useEffect(() => {
    expandedHealthAsked().then(value => { setAsked(value); if (value) load(); }).catch(() => setAsked(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = async () => {
    if (await requestExpandedHealth().catch(() => false)) {
      setAsked(true);
      await load();
    }
  };

  const today = localDateISO();
  const sleepPoints: HealthPoint[] = data
    ? Object.entries(data.sleepByDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, at: date, value }))
    : [];
  const rows = data ? [
    { key: 'sleep', label: t('healthx.sleep'), unit: 'h', points: sleepPoints },
    { key: 'hrv', label: t('healthx.hrv'), unit: 'ms', points: data.hrv },
    { key: 'rhr', label: t('healthx.rhr'), unit: 'bpm', points: data.restingHeartRate },
    { key: 'glucose', label: t('healthx.glucose'), unit: 'mg/dL', points: data.glucose },
    { key: 'lean', label: t('healthx.lean'), unit: 'lb', points: data.leanMass },
    { key: 'waist', label: t('healthx.waist'), unit: 'in', points: data.waist },
  ].filter(row => row.points.length > 0) : [];

  return (
    <Card>
      <CardLabel icon="❤">{t('healthx.title')}</CardLabel>
      {asked === false && (
        <>
          <Text style={s.body}>{t('healthx.connectBody')}</Text>
          <Pressable style={s.btn} onPress={connect} accessibilityRole="button">
            <Text style={s.btnText}>{t('healthx.connect')}</Text>
          </Pressable>
        </>
      )}
      {asked && data && rows.length === 0 && <Text style={s.body}>{t('healthx.none')}</Text>}
      {rows.map(row => {
        const latest = row.points[row.points.length - 1];
        const a30 = recentMean(row.points, today, 30);
        const a90 = recentMean(row.points, today, 90);
        return (
          <View key={row.key} style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{row.label}</Text>
              <Text style={s.value}>{latest.value} {row.unit}</Text>
              <Text style={s.meta}>
                {t('healthx.averages', { a30: a30 ?? '—', a90: a90 ?? '—', unit: row.unit })}
              </Text>
            </View>
            <Spark points={row.points.slice(-30)} />
          </View>
        );
      })}
      {asked && <Text style={s.footer}>{t('healthx.footer')}</Text>}
    </Card>
  );
}

function Spark({ points }: { points: HealthPoint[] }) {
  if (points.length < 2) return null;
  const w = 90;
  const h = 34;
  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p.value - min) / span) * (h - 4) - 2}`).join(' ');
  return (
    <Svg width={w} height={h}>
      <Polyline points={coords} fill="none" stroke={colors.primary} strokeWidth={1.8} />
    </Svg>
  );
}

const s = StyleSheet.create({
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  btn: { marginTop: 12, minHeight: 44, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderFaint, gap: 10 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  value: { color: colors.white, fontSize: 18, fontWeight: '800', marginTop: 2 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  footer: { color: colors.textMuted, fontSize: 12, marginTop: 10 },
});
