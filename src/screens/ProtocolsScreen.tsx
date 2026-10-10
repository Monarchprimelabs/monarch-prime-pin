import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, CardLabel, Disclaimer } from '../components/UI';
import { kit, ShellHeader } from '../components/FormKit';
import { CompoundField } from '../components/CompoundField';
import { colors, radius, spacing, withAlpha } from '../theme';
import { formatClockTime } from '../data/peptides';
import { useI18n } from '../lib/i18n';
import { localDateISO, parseLocalDay } from '../lib/dates';
import { deleteProtocol, getProtocols, getVials, newProtocolId, saveProtocol } from '../lib/storage';
import type { Vial } from '../lib/vials/types';
import { syncProtocolReminders } from '../lib/protocolReminders';
import { endProtocol, revisionOn, reviseProtocol } from '../lib/schedule/engine';
import { addDays } from '../lib/schedule/days';
import {
  Cycle, DOSE_UNITS, DoseUnit, Frequency, Protocol, ProtocolRevision, Weekday,
} from '../lib/schedule/types';

type TFn = (key: string, vars?: Record<string, string | number>) => string;

type FrequencyChoice = 'daily' | 'everyOther' | 'twiceWeek' | 'onOff' | 'specificDays' | 'everyN';
const FREQUENCY_CHOICES: FrequencyChoice[] = ['daily', 'everyOther', 'twiceWeek', 'onOff', 'specificDays', 'everyN'];
const MAX_TIMES = 4;

/** Weekday display order: Sunday first for en-US, Monday first otherwise. */
export function weekdayOrder(dateLocale: string): Weekday[] {
  return dateLocale === 'en-US' ? [0, 1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5, 6, 0];
}

/** Short weekday name; 2026-03-01 was a Sunday. */
export function weekdayName(day: number, dateLocale: string, style: 'short' | 'narrow' = 'short'): string {
  return parseLocalDay(addDays('2026-03-01', day)).toLocaleDateString(dateLocale, { weekday: style });
}

export function formatDay(iso: string, dateLocale: string): string {
  return parseLocalDay(iso).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function describeFrequency(frequency: Frequency, t: TFn, dateLocale: string): string {
  switch (frequency.kind) {
    case 'daily': return t('proto.freq.daily');
    case 'interval': return frequency.everyDays === 2 ? t('proto.freq.everyOther') : t('proto.freq.everyNText', { n: frequency.everyDays });
    case 'onOff': return t('proto.freq.onOffText', { on: frequency.onDays, off: frequency.offDays });
    case 'weekdays': {
      const order = weekdayOrder(dateLocale);
      const days = [...frequency.days].sort((a, b) => order.indexOf(a) - order.indexOf(b));
      return days.map(d => weekdayName(d, dateLocale)).join(', ');
    }
  }
}

export function describeRevision(revision: ProtocolRevision, t: TFn, dateLocale: string): string {
  const parts = [
    describeFrequency(revision.frequency, t, dateLocale),
    revision.times.map(formatClockTime).join(', '),
  ];
  if (revision.cycle) parts.push(t('proto.cycleText', { on: revision.cycle.onDays, off: revision.cycle.offDays }));
  return parts.join(' · ');
}

const toNumber = (value: string) => Number(String(value).replace(',', '.'));
const isWholeIn = (value: string, min: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
};

function toTimeString(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

// ============================================================
// PROTOCOL LIST (S13)
// ============================================================
export function ProtocolsTool({ onClose }: { onClose: () => void }) {
  const { t, dateLocale } = useI18n();
  const [items, setItems] = useState<Protocol[]>([]);
  const [editing, setEditing] = useState<Protocol | 'new' | null>(null);

  const refresh = () => getProtocols().then(setItems).catch(() => setItems([]));
  useEffect(() => { refresh(); }, []);

  const today = localDateISO();
  const active = items.filter(p => p.status === 'active');
  const ended = items.filter(p => p.status === 'ended');

  const confirmEnd = (protocol: Protocol) => {
    Alert.alert(t('proto.endTitle'), t('proto.endBody', { name: protocol.compound }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('proto.end'),
        style: 'destructive',
        onPress: async () => {
          // Today stays on the plan so anything already logged today still matches.
          await saveProtocol(endProtocol(protocol, today, new Date().toISOString()));
          await syncProtocolReminders().catch(() => undefined);
          refresh();
        },
      },
    ]);
  };

  const confirmDelete = (protocol: Protocol) => {
    Alert.alert(t('proto.deleteTitle'), t('proto.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteProtocol(protocol.id);
          await syncProtocolReminders().catch(() => undefined);
          refresh();
        },
      },
    ]);
  };

  if (editing) {
    return (
      <ProtocolBuilder
        initial={editing === 'new' ? undefined : editing}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); }}
      />
    );
  }

  const renderItem = (protocol: Protocol) => {
    const revision = revisionOn(protocol, today < protocol.startDate ? protocol.startDate : today)
      ?? protocol.revisions[protocol.revisions.length - 1];
    return (
      <View key={protocol.id} style={s.listItem}>
        <View style={{ flex: 1 }}>
          <Text style={s.listTitle}>{protocol.compound}</Text>
          {!!revision && (
            <Text style={s.listMeta}>
              {revision.amount} {revision.unit} · {describeRevision(revision, t, dateLocale)}
            </Text>
          )}
          <Text style={s.listMeta}>
            {protocol.status === 'ended' && protocol.endDate
              ? t('proto.endedOn', { date: formatDay(protocol.endDate, dateLocale) })
              : protocol.startDate > today
                ? t('proto.startsOn', { date: formatDay(protocol.startDate, dateLocale) })
                : t('proto.since', { date: formatDay(protocol.startDate, dateLocale) })}
            {revision && !revision.reminders ? t('proto.remindersOffMeta') : ''}
          </Text>
          <View style={s.itemActions}>
            {protocol.status === 'active' && (
              <>
                <Pressable style={s.smallBtn} onPress={() => setEditing(protocol)} accessibilityRole="button">
                  <Text style={s.smallBtnText}>{t('history.edit')}</Text>
                </Pressable>
                <Pressable style={s.smallBtn} onPress={() => confirmEnd(protocol)} accessibilityRole="button">
                  <Text style={s.smallBtnText}>{t('proto.end')}</Text>
                </Pressable>
              </>
            )}
            <Pressable style={s.smallBtn} onPress={() => confirmDelete(protocol)} accessibilityRole="button">
              <Text style={[s.smallBtnText, { color: colors.red }]}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <ShellHeader title={t('proto.title')} backLabel={t('settings.backToTools')} onBack={onClose} />
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.notice}><Text style={s.noticeText}>{t('proto.notice')}</Text></View>
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
          <Pressable style={s.primaryBtn} onPress={() => setEditing('new')} accessibilityRole="button">
            <Text style={s.primaryBtnText}>{t('proto.new')}</Text>
          </Pressable>
        </View>
        <Card>
          <CardLabel icon="🗓">{t('proto.active')}</CardLabel>
          {active.length === 0 ? <Text style={s.empty}>{t('proto.noneActive')}</Text> : active.map(renderItem)}
        </Card>
        {ended.length > 0 && (
          <Card>
            <CardLabel icon="✓">{t('proto.ended')}</CardLabel>
            {ended.map(renderItem)}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}


// ============================================================
// PROTOCOL BUILDER (S14)
// ============================================================
function choiceFor(frequency: Frequency): FrequencyChoice {
  switch (frequency.kind) {
    case 'daily': return 'daily';
    case 'interval': return frequency.everyDays === 2 ? 'everyOther' : 'everyN';
    case 'onOff': return 'onOff';
    case 'weekdays': return frequency.days.length === 2 ? 'twiceWeek' : 'specificDays';
  }
}

function ProtocolBuilder({ initial, onCancel, onSaved }: {
  initial?: Protocol;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const today = localDateISO();
  const started = !!initial && initial.startDate <= today;
  const current = initial
    ? revisionOn(initial, started ? today : initial.startDate) ?? initial.revisions[initial.revisions.length - 1]
    : undefined;

  const [compound, setCompound] = useState(initial?.compound ?? '');
  const [amount, setAmount] = useState(current?.amount ?? '');
  const [unit, setUnit] = useState<DoseUnit>(current?.unit ?? 'mcg');
  const [choice, setChoice] = useState<FrequencyChoice>(current ? choiceFor(current.frequency) : 'daily');
  const [days, setDays] = useState<Weekday[]>(current?.frequency.kind === 'weekdays' ? current.frequency.days : []);
  const [everyN, setEveryN] = useState(current?.frequency.kind === 'interval' && current.frequency.everyDays !== 2 ? String(current.frequency.everyDays) : '3');
  const [onDays, setOnDays] = useState(current?.frequency.kind === 'onOff' ? String(current.frequency.onDays) : '5');
  const [offDays, setOffDays] = useState(current?.frequency.kind === 'onOff' ? String(current.frequency.offDays) : '2');
  const [cycleOn, setCycleOn] = useState(!!current?.cycle);
  const [cycleOnDays, setCycleOnDays] = useState(current?.cycle ? String(current.cycle.onDays) : '');
  const [cycleOffDays, setCycleOffDays] = useState(current?.cycle ? String(current.cycle.offDays) : '');
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [times, setTimes] = useState<string[]>(current?.times ?? ['08:00']);
  const [reminders, setReminders] = useState(current?.reminders ?? true);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [vialId, setVialId] = useState<string | undefined>(initial?.vialId);
  const [vials, setVials] = useState<Vial[]>([]);
  useEffect(() => { getVials().then(list => setVials(list.filter(v => v.status === 'active' || v.id === initial?.vialId))).catch(() => undefined); }, [initial?.vialId]);
  const [picker, setPicker] = useState<{ kind: 'date' } | { kind: 'time'; index: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const pickerTheme = colors.statusBar === 'light' ? 'dark' : 'light';
  const order = weekdayOrder(dateLocale);


  const buildFrequency = (): Frequency | null => {
    switch (choice) {
      case 'daily': return { kind: 'daily' };
      case 'everyOther': return { kind: 'interval', everyDays: 2 };
      case 'everyN': return isWholeIn(everyN, 2, 60) ? { kind: 'interval', everyDays: Number(everyN) } : null;
      case 'onOff':
        return isWholeIn(onDays, 1, 60) && isWholeIn(offDays, 1, 60)
          ? { kind: 'onOff', onDays: Number(onDays), offDays: Number(offDays) } : null;
      case 'twiceWeek': return days.length === 2 ? { kind: 'weekdays', days: [...days].sort() as Weekday[] } : null;
      case 'specificDays': return days.length >= 1 ? { kind: 'weekdays', days: [...days].sort() as Weekday[] } : null;
    }
  };

  const buildCycle = (): Cycle | undefined | null => {
    if (!cycleOn) return undefined;
    return isWholeIn(cycleOnDays, 1, 365) && isWholeIn(cycleOffDays, 1, 365)
      ? { onDays: Number(cycleOnDays), offDays: Number(cycleOffDays) } : null;
  };

  const frequency = buildFrequency();
  const cycle = buildCycle();
  const sortedTimes = [...new Set(times)].sort();
  const summary = frequency
    ? `${describeFrequency(frequency, t, dateLocale)} · ${sortedTimes.map(formatClockTime).join(', ')}${cycle ? ` · ${t('proto.cycleText', { on: cycle.onDays, off: cycle.offDays })}` : ''}`
    : '';

  const toggleDay = (day: Weekday) => {
    setDays(currentDays => {
      if (currentDays.includes(day)) return currentDays.filter(d => d !== day);
      if (choice === 'twiceWeek' && currentDays.length >= 2) return [currentDays[1], day];
      return [...currentDays, day];
    });
  };

  const save = async () => {
    const amountValue = toNumber(amount);
    if (!compound.trim()) { Alert.alert(t('proto.checkTitle'), t('proto.checkCompound')); return; }
    if (!amount.trim() || !Number.isFinite(amountValue) || amountValue <= 0) { Alert.alert(t('proto.checkTitle'), t('proto.checkAmount')); return; }
    if (!frequency) {
      Alert.alert(t('proto.checkTitle'), choice === 'twiceWeek' ? t('proto.checkTwoDays')
        : choice === 'specificDays' ? t('proto.checkDays') : t('proto.checkCounts'));
      return;
    }
    if (cycle === null) { Alert.alert(t('proto.checkTitle'), t('proto.checkCycle')); return; }
    if (sortedTimes.length === 0) { Alert.alert(t('proto.checkTitle'), t('proto.checkTimes')); return; }

    const nowIso = new Date().toISOString();
    const change = {
      amount: amount.trim(), unit, frequency, cycle, times: sortedTimes, reminders,
    };
    let protocol: Protocol;
    if (!initial || !started) {
      // Not started yet: the plan is simply replaced, start date included.
      protocol = {
        id: initial?.id ?? newProtocolId(),
        compound: compound.trim(),
        startDate,
        notes: notes.trim() || undefined,
        vialId,
        status: 'active',
        revisions: [{ ...change, effectiveFrom: startDate, anchorDate: startDate }],
        createdAt: initial?.createdAt ?? nowIso,
        updatedAt: nowIso,
      };
    } else {
      // Started: changes apply from today; earlier days keep their plan.
      protocol = {
        ...reviseProtocol(initial, change, today, nowIso),
        compound: compound.trim(),
        notes: notes.trim() || undefined,
        vialId,
      };
    }

    setSaving(true);
    try {
      await saveProtocol(protocol);
      const result = await syncProtocolReminders({ askPermission: reminders }).catch(() => null);
      if (reminders && result?.permission === 'denied') {
        Alert.alert(t('proto.savedTitle'), t('proto.permissionDenied'), [{ text: t('common.ok'), onPress: onSaved }]);
        return;
      }
      onSaved();
    } catch (error: any) {
      Alert.alert(t('settings.saveFailedTitle'), error?.message || t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  const pickerValue = picker?.kind === 'time'
    ? (() => { const [h, m] = (times[picker.index] ?? '08:00').split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; })()
    : parseLocalDay(startDate);

  const pickerNode = picker && (
    <View style={s.pickerWrap}>
      <DateTimePicker
        value={pickerValue}
        mode={picker.kind}
        display={Platform.OS === 'ios' ? (picker.kind === 'date' ? 'inline' : 'spinner') : 'default'}
        themeVariant={pickerTheme}
        accentColor={colors.primary}
        onChange={(event, selected) => {
          const current = picker;
          if (Platform.OS !== 'ios') setPicker(null);
          if (!selected || event.type === 'dismissed') return;
          if (current.kind === 'date') setStartDate(localDateISO(selected));
          else setTimes(list => list.map((value, i) => (i === current.index ? toTimeString(selected) : value)));
        }}
      />
      {Platform.OS === 'ios' && (
        <Pressable style={s.pickerDone} onPress={() => setPicker(null)}>
          <Text style={s.pickerDoneText}>{t('common.done')}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <ShellHeader title={initial ? t('proto.editTitle') : t('proto.new')} backLabel={t('common.cancel')} onBack={onCancel} />
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {started && <View style={s.notice}><Text style={s.noticeText}>{t('proto.editNotice')}</Text></View>}

        <Card>
          <CardLabel icon="◆">{t('proto.compound')}</CardLabel>
          <CompoundField
            value={compound}
            placeholder={t('proto.compoundPh')}
            accessibilityLabel={t('proto.compound')}
            onChange={picked => {
              setCompound(picked.name);
              // The list's usual unit for that compound; the amount stays the user's.
              if (!amount.trim()) setUnit(picked.defaultUnit);
            }}
          />
        </Card>

        <Card>
          <CardLabel icon="▱">{t('proto.amount')}</CardLabel>
          <View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder={t('proto.amountPh')}
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              style={s.input}
              accessibilityLabel={t('proto.amount')}
            />
            <View style={s.unitRow}>
              {DOSE_UNITS.map(u => (
                <Pressable
                  key={u}
                  style={[s.unitBtn, unit === u && s.unitBtnActive]}
                  onPress={() => setUnit(u)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: unit === u }}
                >
                  <Text style={[s.unitText, unit === u && s.unitTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={s.helper}>{t('proto.amountHelp')}</Text>
        </Card>

        <Card>
          <CardLabel icon="↻">{t('proto.frequency')}</CardLabel>
          <View style={s.chipWrap}>
            {FREQUENCY_CHOICES.map(option => (
              <Pressable
                key={option}
                style={[s.chip, choice === option && s.chipActive]}
                onPress={() => { setChoice(option); if (option === 'twiceWeek' && days.length > 2) setDays(days.slice(0, 2)); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: choice === option }}
              >
                <Text style={[s.chipText, choice === option && s.chipTextActive]}>{t(`proto.freq.${option}`)}</Text>
              </Pressable>
            ))}
          </View>

          {(choice === 'twiceWeek' || choice === 'specificDays') && (
            <>
              <View style={s.weekRow}>
                {order.map(day => (
                  <Pressable
                    key={day}
                    style={[s.dayBtn, days.includes(day) && s.dayBtnActive]}
                    onPress={() => toggleDay(day)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: days.includes(day) }}
                    accessibilityLabel={weekdayName(day, dateLocale, 'short')}
                  >
                    <Text style={[s.dayText, days.includes(day) && s.dayTextActive]}>{weekdayName(day, dateLocale, 'narrow')}</Text>
                  </Pressable>
                ))}
              </View>
              {!frequency && (
                <Text style={s.helperWarn}>{choice === 'twiceWeek' ? t('proto.checkTwoDays') : t('proto.checkDays')}</Text>
              )}
            </>
          )}
          {choice === 'everyN' && (
            <NumberRow label={t('proto.everyNLabel')} value={everyN} setValue={setEveryN} />
          )}
          {choice === 'onOff' && (
            <View style={s.twoCol}>
              <NumberRow label={t('proto.daysOn')} value={onDays} setValue={setOnDays} />
              <NumberRow label={t('proto.daysOff')} value={offDays} setValue={setOffDays} />
            </View>
          )}

          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchTitle}>{t('proto.cycle')}</Text>
              <Text style={s.switchSub}>{t('proto.cycleSub')}</Text>
            </View>
            <Switch value={cycleOn} onValueChange={setCycleOn} trackColor={{ false: colors.textDim, true: colors.primaryDark }} thumbColor={colors.actionText} />
          </View>
          {cycleOn && (
            <View style={s.twoCol}>
              <NumberRow label={t('proto.cycleOnDays')} value={cycleOnDays} setValue={setCycleOnDays} />
              <NumberRow label={t('proto.cycleOffDays')} value={cycleOffDays} setValue={setCycleOffDays} />
            </View>
          )}
          {!!summary && <Text style={s.summary}>{summary}</Text>}
        </Card>

        <Card>
          <CardLabel icon="🕘">{t('proto.timesLabel')}</CardLabel>
          {times.map((time, index) => (
            <View key={`${index}-${time}`} style={s.timeRow}>
              <Pressable style={[s.input, s.pickerField]} onPress={() => setPicker({ kind: 'time', index })} accessibilityRole="button">
                <Text style={s.pickerFieldText}>{formatClockTime(time)}</Text>
              </Pressable>
              {times.length > 1 && (
                <Pressable style={s.removeBtn} onPress={() => setTimes(times.filter((_, i) => i !== index))} accessibilityRole="button" accessibilityLabel={t('proto.removeTime')}>
                  <Text style={s.removeText}>×</Text>
                </Pressable>
              )}
            </View>
          ))}
          {picker?.kind === 'time' && pickerNode}
          {times.length < MAX_TIMES && (
            <Pressable onPress={() => setTimes([...times, '20:00'])} accessibilityRole="button">
              <Text style={s.linkText}>{t('proto.addTime')}</Text>
            </Pressable>
          )}
          <View style={s.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.switchTitle}>{t('tools.localReminder')}</Text>
              <Text style={s.switchSub}>{t('proto.remindersSub')}</Text>
            </View>
            <Switch value={reminders} onValueChange={setReminders} trackColor={{ false: colors.textDim, true: colors.primaryDark }} thumbColor={colors.actionText} />
          </View>
        </Card>

        {vials.length > 0 && (
          <Card>
            <CardLabel icon="🧪">{t('proto.vialLabel')}</CardLabel>
            <View style={s.chipWrap}>
              <Pressable style={[s.chip, !vialId && s.chipActive]} onPress={() => setVialId(undefined)} accessibilityRole="radio" accessibilityState={{ selected: !vialId }}>
                <Text style={[s.chipText, !vialId && s.chipTextActive]}>{t('proto.noVial')}</Text>
              </Pressable>
              {vials.map(vial => (
                <Pressable key={vial.id} style={[s.chip, vialId === vial.id && s.chipActive]} onPress={() => setVialId(vial.id)} accessibilityRole="radio" accessibilityState={{ selected: vialId === vial.id }}>
                  <Text style={[s.chipText, vialId === vial.id && s.chipTextActive]}>{`${vial.label} · ${formatDay(vial.openedAt, dateLocale)}`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.helper}>{t('proto.vialHelp')}</Text>
          </Card>
        )}

        <Card>
          <CardLabel icon="📅">{t('proto.startDate')}</CardLabel>
          {started ? (
            <Text style={s.helper}>{t('proto.since', { date: formatDay(startDate, dateLocale) })}</Text>
          ) : (
            <Pressable style={[s.input, s.pickerField]} onPress={() => setPicker({ kind: 'date' })} accessibilityRole="button">
              <Text style={s.pickerFieldText}>{formatDay(startDate, dateLocale)}</Text>
            </Pressable>
          )}
          {picker?.kind === 'date' && pickerNode}
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={t('tools.optionalNotes')}
            placeholderTextColor={colors.textFaint}
            multiline
            style={[s.input, s.multiline]}
          />
        </Card>

        <View style={{ paddingHorizontal: spacing.xl }}>
          <Pressable style={[s.primaryBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} accessibilityRole="button">
            <Text style={s.primaryBtnText}>{t('proto.save')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NumberRow({ label, value, setValue }: { label: string; value: string; setValue: (v: string) => void }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={v => setValue(v.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        style={s.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const s = { ...kit, ...StyleSheet.create({
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 },
  dayBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgPill },
  dayBtnActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  dayText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  dayTextActive: { color: colors.actionText },
  summary: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  removeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  removeText: { color: colors.red, fontSize: 24 },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '700', paddingVertical: 6 },
}) };
