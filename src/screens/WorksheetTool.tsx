import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { ReadableScrollView as ScrollView } from '../components/Columns';
import { Card, CardLabel } from '../components/UI';
import { hapticTap } from '../lib/haptics';
import { useI18n } from '../lib/i18n';
import {
  Field, formatMass, formatNumber, Notice, parsePositiveNumber, SegmentButton, ToolShell, toolStyles,
} from './ToolsScreen';

// The concentration worksheet (Tools > Worksheet). Its own module so the
// no-worksheet build (EXPO_PUBLIC_REMOVE_WORKSHEET) leaves it out entirely.
// scripts/check-no-worksheet.js looks for this marker in that bundle.
export const WORKSHEET_MARKER = 'mpp-worksheet-module';

const U100_MARKINGS = [1, 5, 10, 20, 50];
// Real U-100 barrels come in 30, 50, and 100 unit sizes; the gauge picks the
// smallest scale the reading fits on so small readings stay legible.
const GAUGE_SCALES = [30, 50, 100];
// The user can fix the scale to their own syringe: 0.3, 0.5 or 1 mL U-100
// barrels hold 30, 50 or 100 units. 'auto' keeps the old fit-to-reading.
type SyringeSize = 'auto' | 30 | 50 | 100;
const SYRINGE_SIZES: SyringeSize[] = ['auto', 30, 50, 100];

export function WorksheetTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [solutionMass, setSolutionMass] = useState('');
  const [solutionMassUnit, setSolutionMassUnit] = useState('mg');
  const [liquidVolume, setLiquidVolume] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetUnit, setTargetUnit] = useState('mg');
  const [syringe, setSyringe] = useState<SyringeSize>('auto');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showMath, setShowMath] = useState(false);
  // Fields start empty every time (no saved or suggested values).

  const copyText = async (key: string, text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      hapticTap();
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(current => (current === key ? null : current)), 1400);
    } catch {
      // Clipboard is best-effort; never block the worksheet.
    }
  };

  const worksheetResults = useMemo(() => {
    const mass = parsePositiveNumber(solutionMass);
    const volume = parsePositiveNumber(liquidVolume);
    if (!mass || !volume) return { concentration: [], u100: [] };
    const massMg = solutionMassUnit === 'mg' ? mass : mass / 1000;
    const totalU100Units = volume * 100;
    const mcgPerUnit = (massMg * 1000) / totalU100Units;

    return {
      concentration: [
        { label: t('tools.concLabel'), value: `${formatNumber(massMg / volume)} mg/mL` },
        { label: t('tools.concLabel'), value: `${formatNumber((massMg * 1000) / volume)} mcg/mL` },
      ],
      u100: [
        { label: t('tools.enteredVolume'), value: `${formatNumber(totalU100Units)} ${t('tools.u100Units')}` },
        ...U100_MARKINGS.map(units => ({
          label: units === 1 ? t('tools.unitsEqOne') : t('tools.unitsEqMany', { n: units }),
          value: formatMass(mcgPerUnit * units),
        })),
      ],
    };
  }, [liquidVolume, solutionMass, solutionMassUnit, t]);

  const gauge = useMemo(() => {
    const mass = parsePositiveNumber(solutionMass);
    const volume = parsePositiveNumber(liquidVolume);
    const target = parsePositiveNumber(targetAmount);
    if (!mass || !volume || !target) return null;
    const massMg = solutionMassUnit === 'mg' ? mass : mass / 1000;
    const mcgPerUnit = (massMg * 1000) / (volume * 100);
    const targetMcg = targetUnit === 'mg' ? target * 1000 : target;
    const units = targetMcg / mcgPerUnit;
    return { units, ml: units / 100, massLabel: formatMass(targetMcg) };
  }, [liquidVolume, solutionMass, solutionMassUnit, targetAmount, targetUnit]);

  const summaryText = worksheetResults.concentration.length === 0 ? null : [
    t('tools.summaryTitle'),
    t('tools.summaryEntered', { mass: solutionMass, unit: solutionMassUnit, vol: liquidVolume }),
    ...worksheetResults.concentration.map(result => `${result.label}: ${result.value}`),
    ...worksheetResults.u100.map(result => `${result.label}: ${result.value}`),
    ...(gauge ? [t('tools.gauge.summaryLine', {
      amount: targetAmount, unit: targetUnit, units: formatNumber(gauge.units), ml: formatNumber(gauge.ml),
    })] : []),
    t('tools.summaryFoot1'),
    t('tools.summaryFoot2'),
  ].join('\n');

  return (
    <ToolShell title={t('tools.worksheet.title')} onClose={onClose}>
      <ScrollView testID={WORKSHEET_MARKER} contentContainerStyle={toolStyles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Permanent, not dismissible (Guideline 1.4.2). */}
        <Notice text={t('tools.notice.worksheet')} />
        <Pressable onPress={() => setShowMath(v => !v)} style={toolStyles.mathToggle} accessibilityRole="button" accessibilityState={{ expanded: showMath }}>
          <Text style={toolStyles.mathToggleText}>{showMath ? t('tools.hideMath') : t('tools.showMath')}</Text>
        </Pressable>
        {showMath && <Text style={toolStyles.mathText}>{t('tools.mathFormula')}</Text>}
        <Card>
          <CardLabel icon="▱">{t('tools.solutionConc')}</CardLabel>
          <Text style={toolStyles.fieldLabel}>{t('tools.totalMass')}</Text>
          <View style={toolStyles.inlineInputRow}>
            <Field value={solutionMass} setValue={setSolutionMass} placeholder={t('tools.totalMassPh')} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={toolStyles.compactToggle}>
              {[{ id: 'mg', label: 'mg' }, { id: 'mcg', label: 'mcg' }].map(option => (
                <Pressable
                  key={option.id}
                  style={[toolStyles.compactBtn, solutionMassUnit === option.id && toolStyles.compactBtnActive]}
                  onPress={() => setSolutionMassUnit(option.id)}
                >
                  <Text style={[toolStyles.compactText, solutionMassUnit === option.id && toolStyles.compactTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[toolStyles.fieldLabel, { marginTop: 14 }]}>{t('tools.liquidVolume')}</Text>
          <Field value={liquidVolume} setValue={setLiquidVolume} placeholder={t('tools.liquidVolumePh')} keyboardType="decimal-pad" />
          <View style={toolStyles.resultPanel}>
            {worksheetResults.concentration.length > 0 ? worksheetResults.concentration.map((result, index) => {
              const rowKey = `conc-${index}`;
              return (
                <Pressable key={rowKey} style={toolStyles.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={toolStyles.resultLabel}>{copiedKey === rowKey ? t('tools.copied') : result.label}</Text>
                  <Text style={toolStyles.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={toolStyles.resultEmpty}>{t('tools.emptyConc')}</Text>
            )}
          </View>
          {worksheetResults.concentration.length > 0 && (
            <Text style={toolStyles.copyHint}>{t('tools.tapToCopy')}</Text>
          )}
        </Card>

        <Card>
          <CardLabel icon="▱">{t('tools.u100Label')}</CardLabel>
          <Text style={toolStyles.referenceText}>
            {t('tools.u100Reference')}
          </Text>
          <View style={toolStyles.resultPanel}>
            {worksheetResults.u100.length > 0 ? worksheetResults.u100.map((result, index) => {
              const rowKey = `u100-${index}`;
              return (
                <Pressable key={rowKey} style={toolStyles.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={toolStyles.resultLabel}>{copiedKey === rowKey ? t('tools.copied') : result.label}</Text>
                  <Text style={toolStyles.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={toolStyles.resultEmpty}>{t('tools.emptyU100')}</Text>
            )}
          </View>
          {!!summaryText && (
            <Pressable
              style={[toolStyles.primaryBtn, { marginTop: 12 }]}
              onPress={() => copyText('summary', summaryText)}
            >
              <Text style={toolStyles.primaryBtnText}>
                {copiedKey === 'summary' ? t('tools.copied') : t('tools.copySummary')}
              </Text>
            </Pressable>
          )}
        </Card>

        <Card>
          <CardLabel icon="▱">{t('tools.gauge.label')}</CardLabel>
          <Text style={toolStyles.fieldLabel}>{t('tools.gauge.amountLabel')}</Text>
          <View style={toolStyles.inlineInputRow}>
            <Field value={targetAmount} setValue={setTargetAmount} placeholder={t('tools.gauge.amountPh')} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={toolStyles.compactToggle}>
              {[{ id: 'mg', label: 'mg' }, { id: 'mcg', label: 'mcg' }].map(option => (
                <Pressable
                  key={option.id}
                  style={[toolStyles.compactBtn, targetUnit === option.id && toolStyles.compactBtnActive]}
                  onPress={() => setTargetUnit(option.id)}
                >
                  <Text style={[toolStyles.compactText, targetUnit === option.id && toolStyles.compactTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[toolStyles.fieldLabel, { marginTop: 14 }]}>{t('tools.gauge.syringeLabel')}</Text>
          <View style={toolStyles.segment}>
            {SYRINGE_SIZES.map(size => (
              <SegmentButton
                key={String(size)}
                label={size === 'auto' ? t('tools.gauge.syringeAuto') : `${size / 100} mL`}
                active={syringe === size}
                onPress={() => setSyringe(size)}
              />
            ))}
          </View>
          {gauge ? (
            <UnitGauge units={gauge.units} ml={gauge.ml} massLabel={gauge.massLabel} fixedScale={syringe === 'auto' ? undefined : syringe} />
          ) : (
            <View style={[toolStyles.resultPanel, { marginTop: 14 }]}>
              <Text style={toolStyles.resultEmpty}>{t('tools.gauge.empty')}</Text>
            </View>
          )}
          <Text style={toolStyles.gaugeNote}>{t('tools.gauge.note')}</Text>
        </Card>

        <Text style={toolStyles.calculatorFootnote}>
          {t('tools.calcFootnote')}
        </Text>
      </ScrollView>
    </ToolShell>
  );
}

// Horizontal unit-scale gauge: a left-to-right fill with a ruler of tick marks
// underneath, read the same way as the printed scale on a barrel. Drawn
// entirely with views — deliberately NOT a syringe illustration.
function UnitGauge({ units, ml, massLabel, fixedScale }: { units: number; ml: number; massLabel: string; fixedScale?: number }) {
  const { t } = useI18n();
  const scale = fixedScale ?? GAUGE_SCALES.find(max => units <= max) ?? 100;
  const over = units > scale;
  const pct = Math.max(0.005, Math.min(1, units / scale));
  const majorStep = scale === 100 ? 20 : 10;
  const minorStep = scale === 100 ? 10 : 5;
  const ticks: number[] = [];
  for (let mark = 0; mark <= scale; mark += minorStep) ticks.push(mark);

  return (
    <View style={toolStyles.gaugeWrap}>
      <View style={toolStyles.gaugeReadoutRow}>
        <Text style={[toolStyles.gaugeUnitsBig, over && toolStyles.gaugeUnitsBigOver]}>
          {t('tools.gauge.unitsBig', { n: formatNumber(units) })}
        </Text>
        <View style={toolStyles.gaugeReadoutRight}>
          <Text style={toolStyles.gaugeLine}>{t('tools.gauge.mlLine', { v: formatNumber(ml) })}</Text>
          <Text style={toolStyles.gaugeMass}>= {massLabel}</Text>
        </View>
      </View>
      <View style={toolStyles.gaugeTrackH}>
        <View style={[toolStyles.gaugeFillH, { width: `${pct * 100}%` }, over && toolStyles.gaugeFillOver]} />
        <View style={[toolStyles.gaugeMarkerH, { left: `${pct * 100}%` }, over && toolStyles.gaugeMarkerOver]} />
      </View>
      <View style={toolStyles.gaugeRuler}>
        {ticks.map(mark => {
          const major = mark % majorStep === 0;
          return (
            <View key={mark} style={[toolStyles.gaugeTickCol, { left: `${(mark / scale) * 100}%` }]}>
              <View style={[toolStyles.gaugeTickLineH, major && toolStyles.gaugeTickLineHMajor]} />
              {major && <Text style={toolStyles.gaugeTickLabelH}>{mark}</Text>}
            </View>
          );
        })}
      </View>
      <Text style={toolStyles.gaugeScaleCaption}>{t('tools.gauge.scaleCaption', { scale })}</Text>
      {over && (
        <Text style={toolStyles.gaugeOverText}>
          {fixedScale ? t('tools.gauge.overSyringe', { scale, ml: scale / 100 }) : t('tools.gauge.over')}
        </Text>
      )}
    </View>
  );
}

