import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { ReadableScrollView as ScrollView } from '../components/Columns';
import { Card, Disclaimer } from '../components/UI';
import { kit, ShellHeader } from '../components/FormKit';
import { colors, spacing, withAlpha } from '../theme';
import { useI18n } from '../lib/i18n';
import { localDateISO, parseLocalDay } from '../lib/dates';
import {
  deleteLabResult, getInjections, getLabResults, getNextLabDate, newLabResultId, saveLabResult, setNextLabDate,
} from '../lib/storage';
import { latestByMarker, parseLabNumber, rangeStatus, seriesFor } from '../lib/labs/labs';
import { suggestMarkers } from '../lib/labs/markers';
import type { LabResult } from '../lib/labs/types';
import { exportLabCsv } from '../lib/exportData';
import { notifyPositiveMoment } from '../lib/reviewPrompt';
import { syncLabReminders } from '../lib/labReminders';

// Lab results (Premium). The user types values and the reference range from
// their own report; the app only charts them. The one statement it makes is
// "Outside the reference range you entered". No interpretation (1.4.1).

type Screen = { kind: 'list' } | { kind: 'marker'; marker: string } | { kind: 'edit'; result: LabResult | null };

export function LabsTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [results, setResults] = useState<LabResult[]>([]);
  const [logDates, setLogDates] = useState<string[]>([]);
  const [view, setView] = useState<Screen>({ kind: 'list' });
  const [nextLab, setNextLab] = useState<string | null>(null);
  const [pickingNext, setPickingNext] = useState(false);

  const refresh = () => {
    getLabResults().then(setResults).catch(() => setResults([]));
    getInjections().then(list => setLogDates([...new Set(list.map(r => r.date))])).catch(() => undefined);
    getNextLabDate().then(setNextLab).catch(() => undefined);
  };
  useEffect(refresh, []);

  const chooseNextLab = async (date: string | null) => {
    setNextLab(date);
    await setNextLabDate(date);
    syncLabReminders().catch(() => undefined);
  };

  const exportCsv = async () => {
    try {
      const { count } = await exportLabCsv();
      if (count === 0) Alert.alert(t('labs.exportNothing'));
      else notifyPositiveMoment('export');
    } catch (error: any) {
      Alert.alert(t('tools.exportFailed'), error?.message || t('common.tryAgain'));
    }
  };

  if (view.kind === 'edit') {
    return (
      <LabForm
        initial={view.result}
        usedMarkers={[...new Set(results.map(r => r.markerName))]}
        onCancel={() => setView({ kind: 'list' })}
        onSaved={() => { refresh(); setView({ kind: 'list' }); }}
      />
    );
  }

  if (view.kind === 'marker') {
    const series = seriesFor(results, view.marker);
    return (
      <SafeAreaView style={kit.app} edges={['top', 'bottom', 'left', 'right']}>
        <Disclaimer />
        <ShellHeader title={view.marker} backLabel={t('labs.back')} onBack={() => setView({ kind: 'list' })} />
        <ScrollView contentContainerStyle={kit.scrollContent}>
          <Card>
            <LabChart series={series} logDates={logDates} />
            <Text style={s.chartCaption}>{t('labs.chartCaption')}</Text>
          </Card>
          <Card>
            {[...series].reverse().map(result => (
              <View key={result.id} style={kit.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={kit.listTitle}>{formatValue(result)}</Text>
                  <Text style={kit.listMeta}>{result.date}{result.panelName ? ` · ${result.panelName}` : ''}{rangeLine(result, t)}</Text>
                  {!!result.notes && <Text style={kit.listMeta}>{result.notes}</Text>}
                  <View style={kit.itemActions}>
                    <Pressable style={kit.smallBtn} onPress={() => setView({ kind: 'edit', result })} accessibilityRole="button">
                      <Text style={kit.smallBtnText}>{t('history.edit')}</Text>
                    </Pressable>
                    <Pressable
                      style={kit.smallBtn}
                      accessibilityRole="button"
                      onPress={() => Alert.alert(t('labs.deleteTitle'), t('labs.deleteBody'), [
                        { text: t('common.cancel'), style: 'cancel' },
                        { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteLabResult(result.id); refresh(); } },
                      ])}
                    >
                      <Text style={[kit.smallBtnText, { color: colors.red }]}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </Card>
          <Text style={s.footer}>{t('labs.disclaimer')}</Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const markers = latestByMarker(results);
  return (
    <SafeAreaView style={kit.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <ShellHeader title={t('labs.title')} backLabel={t('settings.backToTools')} onBack={onClose} />
      <ScrollView contentContainerStyle={kit.scrollContent}>
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
          <Pressable style={kit.primaryBtn} onPress={() => setView({ kind: 'edit', result: null })} accessibilityRole="button">
            <Text style={kit.primaryBtnText}>{t('labs.add')}</Text>
          </Pressable>
        </View>

        <Card>
          <Text style={s.label}>{t('labs.nextLab')}</Text>
          <View style={s.nextRow}>
            <Pressable style={[kit.smallBtn, { flex: 1 }]} onPress={() => setPickingNext(true)} accessibilityRole="button">
              <Text style={kit.smallBtnText}>{nextLab ? parseLocalDay(nextLab).toLocaleDateString() : t('labs.nextLabSet')}</Text>
            </Pressable>
            {!!nextLab && (
              <Pressable style={kit.smallBtn} onPress={() => chooseNextLab(null)} accessibilityRole="button">
                <Text style={kit.smallBtnText}>{t('labs.nextLabClear')}</Text>
              </Pressable>
            )}
          </View>
          <Text style={kit.listMeta}>{t('labs.nextLabNote')}</Text>
          {pickingNext && (
            <DateTimePicker
              value={nextLab ? parseLocalDay(nextLab) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={colors.statusBar === 'light' ? 'dark' : 'light'}
              accentColor={colors.primary}
              minimumDate={new Date()}
              onChange={(event, selected) => {
                setPickingNext(false);
                if (!selected || event.type === 'dismissed') return;
                chooseNextLab(localDateISO(selected));
              }}
            />
          )}
        </Card>

        <Card>
          {markers.length === 0 ? (
            <Text style={kit.empty}>{t('labs.empty')}</Text>
          ) : markers.map(({ marker, latest, count }) => (
            <Pressable key={marker} style={kit.listItem} onPress={() => setView({ kind: 'marker', marker })} accessibilityRole="button">
              <View style={{ flex: 1 }}>
                <Text style={kit.listTitle}>{marker}</Text>
                <Text style={kit.listMeta}>
                  {formatValue(latest)} · {latest.date}{count > 1 ? ` · ${t('labs.resultsCount', { n: count })}` : ''}{rangeLine(latest, t)}
                </Text>
              </View>
              <Text style={s.chev}>›</Text>
            </Pressable>
          ))}
        </Card>

        {results.length > 0 && (
          <View style={{ paddingHorizontal: spacing.xl }}>
            <Pressable style={kit.smallBtn} onPress={exportCsv} accessibilityRole="button">
              <Text style={kit.smallBtnText}>{t('labs.export')}</Text>
            </Pressable>
          </View>
        )}
        <Text style={s.footer}>{t('labs.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatValue(result: LabResult) {
  return `${result.value} ${result.unit}`.trim();
}

function rangeLine(result: LabResult, t: (k: string) => string) {
  const status = rangeStatus(result);
  return status === 'below' || status === 'above' ? ` · ${t('labs.outsideRange')}` : '';
}

/** Values over time; the user's own reference range shaded; log days as ticks. */
function LabChart({ series, logDates }: { series: LabResult[]; logDates: string[] }) {
  const width = 320;
  const height = 170;
  const pad = 18;
  if (series.length === 0) return null;
  const times = series.map(r => parseLocalDay(r.date).getTime());
  const minT = Math.min(...times);
  const maxT = Math.max(...times);
  const latest = series[series.length - 1];
  const bandLow = typeof latest.refLow === 'number' ? latest.refLow : null;
  const bandHigh = typeof latest.refHigh === 'number' ? latest.refHigh : null;
  const values = [...series.map(r => r.value), ...(bandLow !== null ? [bandLow] : []), ...(bandHigh !== null ? [bandHigh] : [])];
  let minV = Math.min(...values);
  let maxV = Math.max(...values);
  if (minV === maxV) { minV -= 1; maxV += 1; }
  const spanT = Math.max(maxT - minT, 24 * 3600 * 1000);
  const x = (time: number) => pad + ((time - minT) / spanT) * (width - pad * 2) + (maxT === minT ? (width - pad * 2) / 2 : 0);
  const y = (value: number) => height - pad - ((value - minV) / (maxV - minV)) * (height - pad * 2);
  const ticks = logDates
    .map(d => parseLocalDay(d).getTime())
    .filter(time => time >= minT && time <= maxT);
  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      {(bandLow !== null || bandHigh !== null) && (
        <Rect
          x={pad}
          width={width - pad * 2}
          y={y(bandHigh ?? maxV)}
          height={Math.max(2, y(bandLow ?? minV) - y(bandHigh ?? maxV))}
          fill={withAlpha(colors.teal, 0.14)}
        />
      )}
      {ticks.map(time => (
        <Line key={time} x1={x(time)} x2={x(time)} y1={height - pad} y2={height - pad + 6} stroke={colors.textFaint} strokeWidth={1} />
      ))}
      {series.length > 1 && (
        <Polyline
          points={series.map((r, i) => `${x(times[i])},${y(r.value)}`).join(' ')}
          fill="none"
          stroke={colors.primary}
          strokeWidth={2}
        />
      )}
      {series.map((r, i) => <Circle key={r.id} cx={x(times[i])} cy={y(r.value)} r={4} fill={colors.primary} />)}
    </Svg>
  );
}

function LabForm({ initial, usedMarkers, onCancel, onSaved }: {
  initial: LabResult | null;
  usedMarkers: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(initial?.date ?? localDateISO());
  const [picking, setPicking] = useState(false);
  const [panel, setPanel] = useState(initial?.panelName ?? '');
  const [marker, setMarker] = useState(initial?.markerName ?? '');
  const [value, setValue] = useState(initial ? String(initial.value) : '');
  const [unit, setUnit] = useState(initial?.unit ?? '');
  const [low, setLow] = useState(initial?.refLow != null ? String(initial.refLow) : '');
  const [high, setHigh] = useState(initial?.refHigh != null ? String(initial.refHigh) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const suggestions = useMemo(() => suggestMarkers(marker, usedMarkers), [marker, usedMarkers]);

  const save = async () => {
    const parsed = parseLabNumber(value);
    if (!marker.trim() || parsed === null) {
      Alert.alert(t('labs.missingTitle'), t('labs.missingBody'));
      return;
    }
    await saveLabResult({
      id: initial?.id ?? newLabResultId(),
      date,
      panelName: panel.trim(),
      markerName: marker.trim(),
      value: parsed,
      unit: unit.trim(),
      refLow: parseLabNumber(low),
      refHigh: parseLabNumber(high),
      notes: notes.trim() || undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    });
    onSaved();
  };

  return (
    <SafeAreaView style={kit.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <ShellHeader title={initial ? t('labs.editTitle') : t('labs.add')} backLabel={t('common.cancel')} onBack={onCancel} />
      <ScrollView contentContainerStyle={kit.scrollContent} keyboardShouldPersistTaps="handled">
        <Card>
          <Text style={s.label}>{t('labs.date')}</Text>
          <Pressable style={kit.input} onPress={() => setPicking(true)} accessibilityRole="button">
            <Text style={{ color: colors.text, fontSize: 14 }}>{parseLocalDay(date).toLocaleDateString()}</Text>
          </Pressable>
          {picking && (
            <DateTimePicker
              value={parseLocalDay(date)}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              themeVariant={colors.statusBar === 'light' ? 'dark' : 'light'}
              accentColor={colors.primary}
              maximumDate={new Date()}
              onChange={(event, selected) => {
                setPicking(false);
                if (selected && event.type !== 'dismissed') setDate(localDateISO(selected));
              }}
            />
          )}
          <Text style={s.label}>{t('labs.marker')}</Text>
          <TextInput style={kit.input} value={marker} onChangeText={setMarker} placeholder={t('labs.markerPh')} placeholderTextColor={colors.textFaint} />
          {suggestions.length > 0 && (
            <View style={kit.chipWrap}>
              {suggestions.map(name => (
                <Pressable key={name} style={kit.chip} onPress={() => setMarker(name)} accessibilityRole="button">
                  <Text style={kit.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('labs.value')}</Text>
              <TextInput style={kit.input} value={value} onChangeText={setValue} keyboardType="decimal-pad" placeholderTextColor={colors.textFaint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.label}>{t('labs.unit')}</Text>
              <TextInput style={kit.input} value={unit} onChangeText={setUnit} placeholder={t('labs.unitPh')} placeholderTextColor={colors.textFaint} autoCapitalize="none" />
            </View>
          </View>
          <Text style={s.label}>{t('labs.range')}</Text>
          <View style={s.row}>
            <TextInput style={[kit.input, { flex: 1 }]} value={low} onChangeText={setLow} keyboardType="decimal-pad" placeholder={t('labs.rangeLow')} placeholderTextColor={colors.textFaint} />
            <TextInput style={[kit.input, { flex: 1 }]} value={high} onChangeText={setHigh} keyboardType="decimal-pad" placeholder={t('labs.rangeHigh')} placeholderTextColor={colors.textFaint} />
          </View>
          <Text style={kit.listMeta}>{t('labs.rangeNote')}</Text>
          <Text style={[s.label, { marginTop: 12 }]}>{t('labs.panel')}</Text>
          <TextInput style={kit.input} value={panel} onChangeText={setPanel} placeholder={t('labs.panelPh')} placeholderTextColor={colors.textFaint} />
          <Text style={s.label}>{t('log.notes')}</Text>
          <TextInput style={[kit.input, kit.multiline]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={colors.textFaint} />
        </Card>
        <View style={{ paddingHorizontal: spacing.xl }}>
          <Pressable style={kit.primaryBtn} onPress={save} accessibilityRole="button">
            <Text style={kit.primaryBtnText}>{t('labs.save')}</Text>
          </Pressable>
        </View>
        <Text style={s.footer}>{t('labs.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: 10 },
  nextRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  chev: { color: colors.textMuted, fontSize: 20, alignSelf: 'center' },
  chartCaption: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  footer: { color: colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
});

