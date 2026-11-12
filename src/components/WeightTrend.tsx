import React, { useEffect, useMemo, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, withAlpha } from '../theme';
import { useI18n } from '../lib/i18n';
import { localDateISO } from '../lib/dates';
import { hapticTap } from '../lib/haptics';
import { inRange, WEIGHT_RANGES, WeightPoint, WeightRange } from '../lib/weight';
import { Card, CardLabel } from './UI';

// Weight trend: logged weights and Apple Health in one line, a range picker,
// and a way to step through each weigh-in (arrows, or drag across the chart).

const W = 300;
const H = 130;
const PAD_L = 34;
const PAD_R = 10;
const PAD_T = 12;
const PAD_B = 22;

const dayMs = (date: string) => new Date(`${date}T12:00:00`).getTime();
const round1 = (n: number) => Math.round(n * 10) / 10;

export function WeightTrendCard({ points, children }: { points: WeightPoint[]; children?: React.ReactNode }) {
  const { t, dateLocale } = useI18n();
  const reduce = useReducedMotion();
  const [range, setRange] = useState<WeightRange>('3M');
  const shown = useMemo(() => inRange(points, range, localDateISO()), [points, range]);
  const [selected, setSelected] = useState(Math.max(0, shown.length - 1));
  const [width, setWidth] = useState(0);
  // Each new range starts on its latest weigh-in, and the line draws in again.
  useEffect(() => { setSelected(Math.max(0, shown.length - 1)); }, [shown]);
  const reveal = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [range, shown.length, reduce, reveal]);
  const revealStyle = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));

  const formatDay = (date: string, withYear = false) =>
    new Date(`${date}T12:00:00`).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) });

  const chart = useMemo(() => {
    if (shown.length < 2) return null;
    const values = shown.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.5, (max - min) * 0.12);
    const lo = min - pad;
    const hi = max + pad;
    const t0 = dayMs(shown[0].date);
    const t1 = dayMs(shown[shown.length - 1].date);
    const span = t1 - t0 || 1;
    const x = (date: string) => PAD_L + ((dayMs(date) - t0) / span) * (W - PAD_L - PAD_R);
    const y = (value: number) => PAD_T + (1 - (value - lo) / (hi - lo)) * (H - PAD_T - PAD_B);
    const pts = shown.map(p => ({ x: x(p.date), y: y(p.value) }));
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${H - PAD_B} L${pts[0].x.toFixed(1)},${H - PAD_B} Z`;
    return { min: round1(min), max: round1(max), pts, line, area, yMin: y(min), yMax: y(max) };
  }, [shown]);

  // Drag across the chart to pick the nearest weigh-in.
  const pick = (e: GestureResponderEvent) => {
    if (!chart || !width) return;
    const vx = (e.nativeEvent.locationX / width) * W;
    let best = 0;
    chart.pts.forEach((p, i) => { if (Math.abs(p.x - vx) < Math.abs(chart.pts[best].x - vx)) best = i; });
    if (best !== selected) { setSelected(best); hapticTap(); }
  };
  const step = (by: number) => {
    const next = Math.min(shown.length - 1, Math.max(0, selected + by));
    if (next !== selected) { hapticTap(); setSelected(next); }
  };

  const current = shown[selected];
  const first = shown[0];
  const delta = current && first ? round1(current.value - first.value) : 0;

  return (
    <Card>
      <CardLabel icon="⚖">{t('reports.weightLabel')}</CardLabel>
      <View style={s.ranges}>
        {WEIGHT_RANGES.map(r => (
          <Pressable
            key={r}
            onPress={() => { if (r !== range) { hapticTap(); setRange(r); } }}
            style={[s.range, r === range && s.rangeActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: r === range }}
          >
            <Text style={[s.rangeText, r === range && s.rangeTextActive]}>{r}</Text>
          </Pressable>
        ))}
      </View>

      {points.length === 0 ? (
        <Text style={s.empty}>{t('reports.noWeight')}</Text>
      ) : shown.length === 0 ? (
        <Text style={s.empty}>{t('weight.noneInRange')}</Text>
      ) : (
        <>
          <View style={s.summary}>
            <View style={{ flex: 1 }}>
              <Text style={s.value}>{current.value} <Text style={s.unit}>lbs</Text></Text>
              <Text style={s.meta}>
                {formatDay(current.date, true)} · {t(current.source === 'health' ? 'weight.fromHealth' : 'weight.fromLog')}
              </Text>
            </View>
            {selected > 0 && (
              <View style={[s.deltaPill, { backgroundColor: withAlpha(delta <= 0 ? colors.teal : colors.accent, 0.16) }]}>
                <Text style={[s.deltaText, { color: delta <= 0 ? colors.teal : colors.accent }]}>
                  {delta > 0 ? '+' : ''}{delta} lbs
                </Text>
                <Text style={s.deltaSince}>{t('weight.since', { date: formatDay(first.date) })}</Text>
              </View>
            )}
          </View>

          {chart ? (
            <View
              style={s.chartBox}
              onLayout={e => setWidth(e.nativeEvent.layout.width)}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderTerminationRequest={() => false}
              onResponderGrant={pick}
              onResponderMove={pick}
              accessibilityLabel={t('weight.dragHint')}
            >
              <Animated.View style={[s.reveal, revealStyle]}>
                <Svg viewBox={`0 0 ${W} ${H}`} width={width || '100%'} height={150} preserveAspectRatio="none">
                  <Defs>
                    <SvgGradient id="wfill" x1="0" y1="0" x2="0" y2="1">
                      <Stop offset="0" stopColor={colors.primary} stopOpacity={0.35} />
                      <Stop offset="1" stopColor={colors.primary} stopOpacity={0} />
                    </SvgGradient>
                  </Defs>
                  <Line x1={PAD_L} y1={chart.yMax} x2={W - PAD_R} y2={chart.yMax} stroke={colors.border} strokeWidth="0.6" strokeDasharray="3 3" />
                  <Line x1={PAD_L} y1={chart.yMin} x2={W - PAD_R} y2={chart.yMin} stroke={colors.border} strokeWidth="0.6" strokeDasharray="3 3" />
                  <SvgText x="2" y={chart.yMax + 3} fill={colors.textMuted} fontSize="8">{chart.max}</SvgText>
                  <SvgText x="2" y={chart.yMin + 3} fill={colors.textMuted} fontSize="8">{chart.min}</SvgText>
                  <SvgText x={PAD_L} y={H - 6} fill={colors.textMuted} fontSize="8">{formatDay(shown[0].date)}</SvgText>
                  <SvgText x={W - PAD_R} y={H - 6} fill={colors.textMuted} fontSize="8" textAnchor="end">{formatDay(shown[shown.length - 1].date)}</SvgText>
                  <Path d={chart.area} fill="url(#wfill)" />
                  <Path d={chart.line} fill="none" stroke={colors.primary} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  {chart.pts.map((p, i) => (
                    <Circle
                      key={i}
                      cx={p.x}
                      cy={p.y}
                      r={i === selected ? 4.5 : 2.4}
                      fill={shown[i].source === 'health' ? colors.bg : colors.primary}
                      stroke={i === selected ? colors.white : colors.primary}
                      strokeWidth={i === selected ? 2 : 1.2}
                    />
                  ))}
                  <Line x1={chart.pts[selected].x} y1={PAD_T - 4} x2={chart.pts[selected].x} y2={H - PAD_B} stroke={colors.white} strokeWidth="0.8" opacity={0.5} />
                </Svg>
              </Animated.View>
            </View>
          ) : (
            <Text style={s.empty}>{t('reports.weightLatestOnly', { w: current.value })}</Text>
          )}

          {shown.length > 1 && (
            <View style={s.stepRow}>
              <Pressable onPress={() => step(-1)} disabled={selected === 0} style={[s.stepBtn, selected === 0 && s.stepDisabled]} accessibilityRole="button" accessibilityLabel={t('weight.prev')}>
                <Ionicons name="chevron-back" size={18} color={colors.primary} />
              </Pressable>
              <Text style={s.stepText}>{t('weight.position', { n: selected + 1, total: shown.length })}</Text>
              <Pressable onPress={() => step(1)} disabled={selected === shown.length - 1} style={[s.stepBtn, selected === shown.length - 1 && s.stepDisabled]} accessibilityRole="button" accessibilityLabel={t('weight.next')}>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            </View>
          )}
          <View style={s.legend}>
            <View style={[s.dot, { backgroundColor: colors.primary }]} /><Text style={s.legendText}>{t('weight.fromLog')}</Text>
            <View style={[s.dot, s.dotHollow]} /><Text style={s.legendText}>{t('weight.fromHealth')}</Text>
          </View>
          <Text style={s.hint}>{t('weight.dragHint')}</Text>
        </>
      )}
      {children}
    </Card>
  );
}

const s = StyleSheet.create({
  ranges: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  range: { flex: 1, paddingVertical: 7, borderRadius: radius.md, alignItems: 'center', backgroundColor: withAlpha(colors.primary, 0.06), borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  rangeActive: { backgroundColor: withAlpha(colors.primary, 0.24), borderColor: colors.primary },
  rangeText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  rangeTextActive: { color: colors.white },
  summary: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  value: { color: colors.white, fontSize: 30, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  deltaPill: { borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'flex-end' },
  deltaText: { fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] },
  deltaSince: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  chartBox: { height: 150, width: '100%' },
  reveal: { height: 150, overflow: 'hidden' },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 6 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(colors.primary, 0.12) },
  stepDisabled: { opacity: 0.35 },
  stepText: { color: colors.textMuted, fontSize: 12, fontVariant: ['tabular-nums'], minWidth: 70, textAlign: 'center' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 6 },
  dotHollow: { borderWidth: 1.5, borderColor: colors.primary, backgroundColor: 'transparent' },
  legendText: { color: colors.textMuted, fontSize: 11 },
  hint: { color: colors.textFaint, fontSize: 11, textAlign: 'center', marginTop: 6 },
  empty: { color: colors.textMuted, fontSize: 13, paddingVertical: 12 },
});
