import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, LayoutAnimation, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, UIManager, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Card, CardLabel, Disclaimer, Header } from '../components/UI';
import { colors, radius, spacing } from '../theme';
import {
  deleteInventoryItem, deleteRecordTemplate, deleteSchedule,
  getInventory, getRecordTemplates, getSchedules,
  InventoryItem, RecordTemplate, saveInventoryItem, saveRecordTemplate,
  saveSchedule, ScheduleEntry, ScheduleRepeat, updateInventoryItem, updateSchedule,
} from '../lib/storage';
import { SettingsScreen } from './SettingsScreen';
import { UpgradeScreen } from './UpgradeScreen';
import { useEntitlements } from '../lib/entitlements';
import { useAuth } from '../lib/auth';
import { cancelLocalReminder, scheduleLocalReminder } from '../lib/notifications';
import { exportInjectionsCsv } from '../lib/exportData';
import { hapticTap } from '../lib/haptics';
import { useI18n } from '../lib/i18n';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function animateListChange(): void {
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}

type ToolId = 'schedule' | 'inventory' | 'templates' | 'conversion' | 'export' | 'settings';

const TOOLS: { id: ToolId; icon: keyof typeof Ionicons.glyphMap; titleKey: string; subKey: string; pro?: boolean }[] = [
  { id: 'conversion', icon: 'calculator-outline', titleKey: 'tools.worksheet.title', subKey: 'tools.worksheet.sub', pro: true },
  { id: 'schedule', icon: 'calendar-outline', titleKey: 'tools.schedule.title', subKey: 'tools.schedule.sub', pro: true },
  { id: 'inventory', icon: 'cube-outline', titleKey: 'tools.inventory.title', subKey: 'tools.inventory.sub', pro: true },
  { id: 'templates', icon: 'document-text-outline', titleKey: 'templates.title', subKey: 'tools.templates.sub', pro: true },
  { id: 'export', icon: 'share-outline', titleKey: 'tools.export.title', subKey: 'tools.export.sub' },
  { id: 'settings', icon: 'settings-outline', titleKey: 'tools.settings.title', subKey: 'tools.settings.sub' },
];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(':').map(Number);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export function ToolsScreen() {
  const [active, setActive] = useState<ToolId | 'upgrade' | null>(null);
  const [exporting, setExporting] = useState(false);
  const { hasPro } = useEntitlements();
  const { user } = useAuth();
  const { t } = useI18n();
  const canUsePro = hasPro || !!user?.isDeveloper;

  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { count } = await exportInjectionsCsv();
      if (count === 0) {
        Alert.alert(t('tools.exportNothingTitle'), t('tools.exportNothingBody'));
      }
    } catch (error: any) {
      Alert.alert(t('tools.exportFailed'), error?.message || t('common.tryAgain'));
    } finally {
      setExporting(false);
    }
  };

  const openTool = (tool: (typeof TOOLS)[number]) => {
    if (tool.id === 'export') {
      runExport();
      return;
    }
    setActive(tool.pro && !canUsePro ? 'upgrade' : tool.id);
  };

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title={t('tools.title')} subtitle={t('tools.subtitle')} />
      <ScrollView contentContainerStyle={s.pageContent}>
        {TOOLS.map(tool => (
          <Pressable
            key={tool.id}
            style={s.toolRow}
            onPress={() => openTool(tool)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${t(tool.titleKey)}`}
          >
            <Ionicons name={tool.icon} size={22} color={colors.primary} style={s.toolIcon} />
            <View style={{ flex: 1 }}>
              <View style={s.toolTitleRow}>
                <Text style={s.toolTitle}>{t(tool.titleKey)}</Text>
                {!!tool.pro && <Text style={s.proBadge}>PRO</Text>}
              </View>
              <Text style={s.toolSub}>{t(tool.subKey)}</Text>
            </View>
            <Text style={s.chev}>›</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={active !== null} animationType="slide" onRequestClose={() => setActive(null)}>
        {active === 'schedule' && <ScheduleTool onClose={() => setActive(null)} />}
        {active === 'inventory' && <InventoryTool onClose={() => setActive(null)} />}
        {active === 'templates' && <TemplatesTool onClose={() => setActive(null)} />}
        {active === 'conversion' && <ConversionTool onClose={() => setActive(null)} />}
        {active === 'settings' && <SettingsScreen onClose={() => setActive(null)} />}
        {active === 'upgrade' && <UpgradeScreen onClose={() => setActive(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function ToolShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <View style={s.toolHeader}>
        <Pressable style={s.backBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close tool">
          <Text style={s.backText}>{t('settings.backToTools')}</Text>
        </Pressable>
        <Text style={s.toolHeaderTitle}>{title}</Text>
        <View style={s.backBtn} />
      </View>
      {children}
    </SafeAreaView>
  );
}

function repeatWeekdayName(date: string, locale: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toLocaleDateString(locale, { weekday: 'long' });
}

// Storage stays ISO (YYYY-MM-DD) — sorting and the dashboard's next-entry
// lookup depend on it. Only the display uses MM-DD-YYYY.
function displayDate(iso: string): string {
  if (!isValidDate(iso)) return iso;
  const [year, month, day] = iso.split('-');
  return `${month}-${day}-${year}`;
}

function toIsoDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

function toTimeString(value: Date): string {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function ScheduleTool({ onClose }: { onClose: () => void }) {
  const { t, dateLocale } = useI18n();
  const [items, setItems] = useState<ScheduleEntry[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState<ScheduleRepeat>('once');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const refresh = () => getSchedules().then(values => { animateListChange(); setItems(values.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))); });
  useEffect(() => { refresh(); }, []);

  const pickerDateValue = isValidDate(date) && isValidTime(time)
    ? new Date(`${date}T${time}:00`)
    : new Date();

  const add = async () => {
    if (!title.trim() || !isValidDate(date) || !isValidTime(time)) {
      Alert.alert(t('tools.checkEntryTitle'), t('tools.checkEntryBody'));
      return;
    }
    const saved = await saveSchedule({
      title: title.trim(),
      date,
      time,
      notes: notes.trim() || undefined,
      repeat,
      reminderEnabled: false,
    });
    if (reminderEnabled) {
      try {
        const notificationId = await scheduleLocalReminder(saved.id, saved.title, saved.date, saved.time, repeat);
        await updateSchedule({ ...saved, reminderEnabled: true, notificationId });
      } catch (error: any) {
        Alert.alert(t('tools.savedNoReminderTitle'), error?.message || t('tools.savedNoReminderBody'));
      }
    }
    setTitle(''); setNotes(''); setRepeat('once'); refresh();
  };

  const toggleComplete = async (item: ScheduleEntry) => {
    if (!item.completedAt) await cancelLocalReminder(item.notificationId);
    await updateSchedule({
      ...item,
      completedAt: item.completedAt ? undefined : new Date().toISOString(),
      notificationId: item.completedAt ? item.notificationId : undefined,
      reminderEnabled: item.completedAt ? item.reminderEnabled : false,
    });
    refresh();
  };

  const remove = async (item: ScheduleEntry) => {
    await cancelLocalReminder(item.notificationId);
    await deleteSchedule(item.id);
    refresh();
  };

  return (
    <ToolShell title={t('tools.scheduleShell')} onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text={t('tools.notice.schedule')} />
        <Card>
          <CardLabel icon="＋">{t('tools.newEntry')}</CardLabel>
          <Field value={title} setValue={setTitle} placeholder={t('tools.entryTitle')} />
          <View style={s.twoCol}>
            <Pressable
              style={[s.input, s.pickerField, { flex: 1 }]}
              onPress={() => { setShowTimePicker(false); setShowDatePicker(current => !current); }}
              accessibilityRole="button"
              accessibilityLabel="Choose date"
            >
              <Text style={s.pickerFieldText}>📅 {displayDate(date)}</Text>
            </Pressable>
            <Pressable
              style={[s.input, s.pickerField, { flex: 1 }]}
              onPress={() => { setShowDatePicker(false); setShowTimePicker(current => !current); }}
              accessibilityRole="button"
              accessibilityLabel="Choose time"
            >
              <Text style={s.pickerFieldText}>🕘 {time}</Text>
            </Pressable>
          </View>
          {showDatePicker && (
            <View style={s.pickerWrap}>
              <DateTimePicker
                value={pickerDateValue}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="dark"
                accentColor={colors.primary}
                onChange={(_event, selected) => {
                  if (Platform.OS !== 'ios') setShowDatePicker(false);
                  if (selected) setDate(toIsoDate(selected));
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={s.pickerDone} onPress={() => setShowDatePicker(false)}>
                  <Text style={s.pickerDoneText}>{t('common.done')}</Text>
                </Pressable>
              )}
            </View>
          )}
          {showTimePicker && (
            <View style={s.pickerWrap}>
              <DateTimePicker
                value={pickerDateValue}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant="dark"
                onChange={(_event, selected) => {
                  if (Platform.OS !== 'ios') setShowTimePicker(false);
                  if (selected) setTime(toTimeString(selected));
                }}
              />
              {Platform.OS === 'ios' && (
                <Pressable style={s.pickerDone} onPress={() => setShowTimePicker(false)}>
                  <Text style={s.pickerDoneText}>{t('common.done')}</Text>
                </Pressable>
              )}
            </View>
          )}
          <Field value={notes} setValue={setNotes} placeholder={t('tools.optionalNotes')} multiline />
          <View style={s.segment}>
            {(['once', 'daily', 'weekly'] as const).map(option => (
              <SegmentButton
                key={option}
                label={option === 'once' ? t('tools.once') : option === 'daily' ? t('tools.daily') : t('tools.weekly')}
                active={repeat === option}
                onPress={() => setRepeat(option)}
              />
            ))}
          </View>
          {repeat !== 'once' && (
            <Text style={s.repeatHint}>
              {repeat === 'daily'
                ? t('tools.repeatDaily', { time })
                : t('tools.repeatWeekly', { day: repeatWeekdayName(date, dateLocale) || t('tools.week'), time })}
            </Text>
          )}
          <View style={s.reminderToggle}>
            <View style={{ flex: 1 }}>
              <Text style={s.reminderToggleTitle}>{t('tools.localReminder')}</Text>
              <Text style={s.reminderToggleSub}>{t('tools.localReminderSub')}</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: 'rgba(120,130,150,0.4)', true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <PrimaryButton label={t('tools.addEntry')} onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📅">{t('tools.yourSchedule')}</CardLabel>
          {items.length === 0 ? <Empty text={t('tools.noSchedule')} /> : items.map(item => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={`${displayDate(item.date)} · ${item.time}${item.repeat === 'daily' ? t('tools.metaRepeatsDaily') : item.repeat === 'weekly' ? t('tools.metaRepeatsWeekly', { day: repeatWeekdayName(item.date, dateLocale) || t('tools.week') }) : ''}${item.completedAt ? t('tools.metaCompleted') : item.reminderEnabled ? t('tools.metaReminderOn') : ''}${item.notes ? `\n${item.notes}` : ''}`}
              accent={item.completedAt ? colors.teal : undefined}
              actions={(!item.repeat || item.repeat === 'once') ? (
                <Pressable style={s.completeBtn} onPress={() => toggleComplete(item)}>
                  <Text style={s.completeBtnText}>{item.completedAt ? t('tools.undo') : t('tools.markDone')}</Text>
                </Pressable>
              ) : undefined}
              onDelete={() => confirmDelete(t, t('tools.itemSchedule'), () => remove(item))}
            />
          ))}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

function InventoryTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [containerMass, setContainerMass] = useState('');
  const [containerMassUnit, setContainerMassUnit] = useState('mg');
  const [received, setReceived] = useState('');
  const [expiration, setExpiration] = useState('');
  const [lowAt, setLowAt] = useState('');
  const [notes, setNotes] = useState('');
  const refresh = () => getInventory().then(values => { animateListChange(); setItems(values); });
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    const qty = Number(quantity);
    const lowStockAt = lowAt.trim() ? Number(lowAt) : undefined;
    if (!name.trim() || !unit.trim() || !Number.isFinite(qty) || qty < 0) {
      Alert.alert(t('tools.checkItemTitle'), t('tools.checkItemBody'));
      return;
    }
    if (lowStockAt !== undefined && (!Number.isFinite(lowStockAt) || lowStockAt < 0)) {
      Alert.alert(t('tools.checkItemTitle'), t('tools.checkLowBody'));
      return;
    }
    const massValue = containerMass.trim() ? parsePositiveNumber(containerMass) : undefined;
    if (containerMass.trim() && !massValue) {
      Alert.alert(t('tools.checkItemTitle'), t('tools.checkMassBody'));
      return;
    }
    if ((received.trim() && !isValidDate(received.trim())) || (expiration.trim() && !isValidDate(expiration.trim()))) {
      Alert.alert(t('tools.checkDatesTitle'), t('tools.checkDatesBody'));
      return;
    }
    await saveInventoryItem({
      name: name.trim(), quantity: qty, unit: unit.trim(),
      containerMassMcg: massValue ? (containerMassUnit === 'mg' ? massValue * 1000 : massValue) : undefined,
      receivedDate: received.trim() || undefined,
      expirationDate: expiration.trim() || undefined,
      lowStockAt,
      notes: notes.trim() || undefined,
    });
    setName(''); setQuantity(''); setUnit(''); setContainerMass(''); setReceived(''); setExpiration(''); setLowAt(''); setNotes(''); refresh();
  };

  return (
    <ToolShell title={t('tools.inventory.title')} onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Card>
          <CardLabel icon="＋">{t('tools.addInventory')}</CardLabel>
          <Field value={name} setValue={setName} placeholder={t('tools.itemName')} />
          <View style={s.twoCol}>
            <Field value={quantity} setValue={setQuantity} placeholder={t('tools.quantity')} keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Field value={unit} setValue={setUnit} placeholder={t('tools.unitContainer')} style={{ flex: 1 }} />
          </View>
          <View style={s.inlineInputRow}>
            <Field value={containerMass} setValue={setContainerMass} placeholder={t('tools.containerMassPh')} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={s.compactToggle}>
              {[{ id: 'mg', label: 'mg' }, { id: 'mcg', label: 'mcg' }].map(option => (
                <Pressable
                  key={option.id}
                  style={[s.compactBtn, containerMassUnit === option.id && s.compactBtnActive]}
                  onPress={() => setContainerMassUnit(option.id)}
                >
                  <Text style={[s.compactText, containerMassUnit === option.id && s.compactTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={{ height: 10 }} />
          <Field value={received} setValue={setReceived} placeholder={t('tools.dateReceived')} />
          <Field value={expiration} setValue={setExpiration} placeholder={t('tools.expDate')} />
          <Field value={lowAt} setValue={setLowAt} placeholder={t('tools.lowStockLevel')} keyboardType="decimal-pad" />
          <Field value={notes} setValue={setNotes} placeholder={t('tools.optionalNotes')} multiline />
          <PrimaryButton label={t('tools.addItem')} onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📦">{t('tools.currentInventory')}</CardLabel>
          {items.length === 0 ? <Empty text={t('tools.noInventory')} /> : items.map(item => {
            const low = item.lowStockAt !== undefined && item.quantity <= item.lowStockAt;
            return (
              <ListItem
                key={item.id}
                title={item.name}
                meta={`${item.quantity} ${item.unit}${item.containerMassMcg ? t('tools.metaEach', { mass: formatContainerMass(item.containerMassMcg) }) : ''}${low ? t('tools.metaLowStock') : ''}${item.expirationDate ? `\n${t('tools.metaExpires', { date: item.expirationDate })}` : ''}${item.notes ? `\n${item.notes}` : ''}`}
                accent={low ? colors.accent : undefined}
                actions={(
                  <View style={s.stepper}>
                    <Pressable
                      style={s.stepBtn}
                      onPress={() => updateInventoryItem({ ...item, quantity: Math.max(0, item.quantity - 1) }).then(refresh)}
                      accessibilityRole="button"
                      accessibilityLabel={`Decrease ${item.name} quantity`}
                    >
                      <Text style={s.stepText}>−</Text>
                    </Pressable>
                    <Pressable
                      style={s.stepBtn}
                      onPress={() => updateInventoryItem({ ...item, quantity: item.quantity + 1 }).then(refresh)}
                      accessibilityRole="button"
                      accessibilityLabel={`Increase ${item.name} quantity`}
                    >
                      <Text style={s.stepText}>+</Text>
                    </Pressable>
                  </View>
                )}
                onDelete={() => confirmDelete(t, t('tools.itemInventory'), () => deleteInventoryItem(item.id).then(refresh))}
              />
            );
          })}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

function TemplatesTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [items, setItems] = useState<RecordTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [compound, setCompound] = useState('');
  const [prompt, setPrompt] = useState('');
  const refresh = () => getRecordTemplates().then(values => { animateListChange(); setItems(values); });
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!title.trim()) { Alert.alert(t('tools.missingTemplateTitle'), t('tools.missingTemplateBody')); return; }
    await saveRecordTemplate({ title: title.trim(), compoundLabel: compound.trim() || undefined, notesPrompt: prompt.trim() || undefined });
    setTitle(''); setCompound(''); setPrompt(''); refresh();
  };
  return (
    <ToolShell title={t('templates.title')} onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text={t('tools.notice.templates')} />
        <Card>
          <CardLabel icon="＋">{t('tools.newTemplate')}</CardLabel>
          <Field value={title} setValue={setTitle} placeholder={t('tools.templateTitle')} />
          <Field value={compound} setValue={setCompound} placeholder={t('tools.compoundLabel')} />
          <Field value={prompt} setValue={setPrompt} placeholder={t('tools.notesPrompt')} multiline />
          <PrimaryButton label={t('tools.saveTemplate')} onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📝">{t('tools.savedTemplates')}</CardLabel>
          {items.length === 0 ? <Empty text={t('tools.noTemplates')} /> : items.map(item => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={`${item.compoundLabel || t('tools.noCompoundLabel')}${item.notesPrompt ? `\n${item.notesPrompt}` : ''}`}
              onDelete={() => confirmDelete(t, t('tools.itemTemplate'), () => deleteRecordTemplate(item.id).then(refresh))}
            />
          ))}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

const KEY_WORKSHEET_INPUTS = '@mpp/worksheet_inputs';
const U100_MARKINGS = [1, 5, 10, 20, 50];
// Real U-100 barrels come in 30, 50, and 100 unit sizes; the gauge picks the
// smallest scale the reading fits on so small readings stay legible.
const GAUGE_SCALES = [30, 50, 100];
const GAUGE_HEIGHT = 208;

function ConversionTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [solutionMass, setSolutionMass] = useState('');
  const [solutionMassUnit, setSolutionMassUnit] = useState('mg');
  const [liquidVolume, setLiquidVolume] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetUnit, setTargetUnit] = useState('mg');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY_WORKSHEET_INPUTS)
      .then(raw => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.mass === 'string') setSolutionMass(saved.mass);
        if (saved.unit === 'mg' || saved.unit === 'mcg') setSolutionMassUnit(saved.unit);
        if (typeof saved.volume === 'string') setLiquidVolume(saved.volume);
        if (typeof saved.target === 'string') setTargetAmount(saved.target);
        if (saved.targetUnit === 'mg' || saved.targetUnit === 'mcg') setTargetUnit(saved.targetUnit);
      })
      .catch(() => undefined)
      .finally(() => { hydrated.current = true; });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(
      KEY_WORKSHEET_INPUTS,
      JSON.stringify({ mass: solutionMass, unit: solutionMassUnit, volume: liquidVolume, target: targetAmount, targetUnit }),
    ).catch(() => undefined);
  }, [solutionMass, solutionMassUnit, liquidVolume, targetAmount, targetUnit]);

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
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text={t('tools.notice.worksheet')} />
        <Card>
          <CardLabel icon="▱">{t('tools.solutionConc')}</CardLabel>
          <Text style={s.fieldLabel}>{t('tools.totalMass')}</Text>
          <View style={s.inlineInputRow}>
            <Field value={solutionMass} setValue={setSolutionMass} placeholder={t('tools.totalMassPh')} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={s.compactToggle}>
              {[{ id: 'mg', label: 'mg' }, { id: 'mcg', label: 'mcg' }].map(option => (
                <Pressable
                  key={option.id}
                  style={[s.compactBtn, solutionMassUnit === option.id && s.compactBtnActive]}
                  onPress={() => setSolutionMassUnit(option.id)}
                >
                  <Text style={[s.compactText, solutionMassUnit === option.id && s.compactTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <Text style={[s.fieldLabel, { marginTop: 14 }]}>{t('tools.liquidVolume')}</Text>
          <Field value={liquidVolume} setValue={setLiquidVolume} placeholder={t('tools.liquidVolumePh')} keyboardType="decimal-pad" />
          <View style={s.resultPanel}>
            {worksheetResults.concentration.length > 0 ? worksheetResults.concentration.map((result, index) => {
              const rowKey = `conc-${index}`;
              return (
                <Pressable key={rowKey} style={s.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={s.resultLabel}>{copiedKey === rowKey ? t('tools.copied') : result.label}</Text>
                  <Text style={s.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={s.resultEmpty}>{t('tools.emptyConc')}</Text>
            )}
          </View>
          {worksheetResults.concentration.length > 0 && (
            <Text style={s.copyHint}>{t('tools.tapToCopy')}</Text>
          )}
        </Card>

        <Card>
          <CardLabel icon="▱">{t('tools.u100Label')}</CardLabel>
          <Text style={s.referenceText}>
            {t('tools.u100Reference')}
          </Text>
          <View style={s.resultPanel}>
            {worksheetResults.u100.length > 0 ? worksheetResults.u100.map((result, index) => {
              const rowKey = `u100-${index}`;
              return (
                <Pressable key={rowKey} style={s.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={s.resultLabel}>{copiedKey === rowKey ? t('tools.copied') : result.label}</Text>
                  <Text style={s.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={s.resultEmpty}>{t('tools.emptyU100')}</Text>
            )}
          </View>
          {!!summaryText && (
            <Pressable
              style={[s.primaryBtn, { marginTop: 12 }]}
              onPress={() => copyText('summary', summaryText)}
            >
              <Text style={s.primaryBtnText}>
                {copiedKey === 'summary' ? t('tools.copied') : t('tools.copySummary')}
              </Text>
            </Pressable>
          )}
        </Card>

        <Card>
          <CardLabel icon="▱">{t('tools.gauge.label')}</CardLabel>
          <Text style={s.fieldLabel}>{t('tools.gauge.amountLabel')}</Text>
          <View style={s.inlineInputRow}>
            <Field value={targetAmount} setValue={setTargetAmount} placeholder={t('tools.gauge.amountPh')} keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={s.compactToggle}>
              {[{ id: 'mg', label: 'mg' }, { id: 'mcg', label: 'mcg' }].map(option => (
                <Pressable
                  key={option.id}
                  style={[s.compactBtn, targetUnit === option.id && s.compactBtnActive]}
                  onPress={() => setTargetUnit(option.id)}
                >
                  <Text style={[s.compactText, targetUnit === option.id && s.compactTextActive]}>{option.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          {gauge ? (
            <UnitGauge units={gauge.units} ml={gauge.ml} massLabel={gauge.massLabel} />
          ) : (
            <View style={[s.resultPanel, { marginTop: 14 }]}>
              <Text style={s.resultEmpty}>{t('tools.gauge.empty')}</Text>
            </View>
          )}
          <Text style={s.gaugeNote}>{t('tools.gauge.note')}</Text>
        </Card>

        <Text style={s.calculatorFootnote}>
          {t('tools.calcFootnote')}
        </Text>
      </ScrollView>
    </ToolShell>
  );
}

// Vertical unit-scale gauge: tick marks and a highlighted fill, drawn entirely
// with views. Deliberately NOT a syringe illustration — it reads like a ruler.
function UnitGauge({ units, ml, massLabel }: { units: number; ml: number; massLabel: string }) {
  const { t } = useI18n();
  const over = units > 100;
  const scale = GAUGE_SCALES.find(max => units <= max) ?? 100;
  const pct = Math.max(0.005, Math.min(1, units / scale));
  const majorStep = scale === 100 ? 20 : 10;
  const minorStep = scale === 100 ? 10 : 5;
  const ticks: number[] = [];
  for (let mark = 0; mark <= scale; mark += minorStep) ticks.push(mark);

  return (
    <View style={s.gaugeRow}>
      <View style={s.gaugeScaleArea}>
        {ticks.map(mark => {
          const major = mark % majorStep === 0;
          return (
            <View key={mark} style={[s.gaugeTickRow, { bottom: (mark / scale) * GAUGE_HEIGHT - 5 }]}>
              <Text style={s.gaugeTickLabel}>{major ? String(mark) : ''}</Text>
              <View style={[s.gaugeTickLine, major && s.gaugeTickLineMajor]} />
            </View>
          );
        })}
        <View style={s.gaugeTrack}>
          <View style={[s.gaugeFill, { height: pct * GAUGE_HEIGHT }, over && s.gaugeFillOver]} />
          <View style={[s.gaugeMarker, { bottom: pct * GAUGE_HEIGHT - 1 }, over && s.gaugeMarkerOver]} />
        </View>
      </View>
      <View style={s.gaugeReadout}>
        <Text style={[s.gaugeUnitsBig, over && s.gaugeUnitsBigOver]}>
          {t('tools.gauge.unitsBig', { n: formatNumber(units) })}
        </Text>
        <Text style={s.gaugeLine}>{t('tools.gauge.mlLine', { v: formatNumber(ml) })}</Text>
        <Text style={s.gaugeMass}>= {massLabel}</Text>
        <Text style={s.gaugeScaleCaption}>{t('tools.gauge.scaleCaption', { scale })}</Text>
        {over && <Text style={s.gaugeOverText}>{t('tools.gauge.over')}</Text>}
      </View>
    </View>
  );
}

function parsePositiveNumber(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d*\.?\d+$/.test(normalized)) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

// Adaptive precision: enough decimals to be useful, never the 6-digit
// repeating tails that overflowed the result panel (e.g. 3,333.333333).
function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const maximumFractionDigits = abs >= 100 ? 1 : abs >= 1 ? 2 : abs >= 0.01 ? 3 : 4;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits }).format(value);
}

// Both units on every line, most readable one first — e.g. "0.5 mg (500 mcg)"
// or "50 mcg (0.05 mg)". Adaptive precision keeps them short enough to fit.
// Compact single-unit mass for list rows — "10 mg", not the dual-unit form.
function formatContainerMass(mcg: number): string {
  return mcg >= 1000 ? `${formatNumber(mcg / 1000)} mg` : `${formatNumber(mcg)} mcg`;
}

function formatMass(mcg: number): string {
  if (mcg >= 1000) return `${formatNumber(mcg / 1000)} mg (${formatNumber(mcg)} mcg)`;
  return `${formatNumber(mcg)} mcg (${formatNumber(mcg / 1000)} mg)`;
}

function Field({ value, setValue, placeholder, multiline, keyboardType, style }: {
  value: string; setValue: (value: string) => void; placeholder: string; multiline?: boolean; keyboardType?: any; style?: any;
}) {
  return <TextInput value={value} onChangeText={setValue} placeholder={placeholder} placeholderTextColor={colors.textFaint} multiline={multiline} keyboardType={keyboardType} style={[s.input, multiline && s.multiline, style]} />;
}
function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable style={s.primaryBtn} onPress={onPress}><Text style={s.primaryBtnText}>{label}</Text></Pressable>;
}
function SegmentButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable style={[s.segmentBtn, active && s.segmentBtnActive]} onPress={onPress}><Text style={[s.segmentText, active && s.segmentTextActive]}>{label}</Text></Pressable>;
}
function Notice({ text }: { text: string }) { return <View style={s.notice}><Text style={s.noticeText}>{text}</Text></View>; }
function Empty({ text }: { text: string }) { return <Text style={s.empty}>{text}</Text>; }
function ListItem({ title, meta, onDelete, accent, actions }: { title: string; meta: string; onDelete: () => void; accent?: string; actions?: React.ReactNode }) {
  return (
    <View style={s.listItem}>
      <View style={{ flex: 1 }}>
        <Text style={[s.listTitle, accent ? { color: accent } : null]}>{title}</Text>
        <Text style={s.listMeta}>{meta}</Text>
      </View>
      {actions}
      <Pressable style={s.deleteSmall} onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${title}`}><Text style={s.deleteSmallText}>×</Text></Pressable>
    </View>
  );
}
function confirmDelete(t: (key: string, vars?: Record<string, string | number>) => string, itemLabel: string, action: () => void) {
  Alert.alert(t('tools.deleteConfirmTitle', { item: itemLabel }), t('tools.noUndo'), [{ text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: action }]);
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  pageContent: { paddingHorizontal: spacing.xl, paddingBottom: 110, gap: 10 },
  toolRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  toolIcon: { width: 42 },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  toolTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 3 },
  proBadge: { color: colors.teal, fontSize: 9, fontWeight: '800', letterSpacing: 1, borderWidth: 1, borderColor: colors.teal, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  toolSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  chev: { color: colors.primary, fontSize: 25, marginLeft: 8 },
  toolHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingHorizontal: spacing.xl },
  backBtn: { width: 80, minHeight: 44, justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  toolHeaderTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: 50 },
  notice: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.accent, backgroundColor: 'rgba(255,140,0,0.08)', padding: 12 },
  noticeText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  input: { minHeight: 48, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 10, fontSize: 14 },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  twoCol: { flexDirection: 'row', gap: 8 },
  primaryBtn: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.action, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  primaryBtnText: { color: colors.actionText, fontSize: 14, fontWeight: '700' },
  listItem: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderFaint, paddingVertical: 12, gap: 8 },
  listTitle: { color: colors.white, fontSize: 14, fontWeight: '700', marginBottom: 4 },
  listMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  deleteSmall: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  deleteSmallText: { color: colors.red, fontSize: 24 },
  stepper: { flexDirection: 'row', gap: 4 },
  stepBtn: { width: 36, height: 36, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgInput },
  stepText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  completeBtn: { minWidth: 48, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.teal, borderRadius: radius.sm },
  completeBtnText: { color: colors.teal, fontSize: 11, fontWeight: '700' },
  reminderToggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingVertical: 4 },
  reminderToggleTitle: { color: colors.white, fontSize: 13, fontWeight: '700' },
  reminderToggleSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  segment: { flexDirection: 'row', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 3, marginBottom: 10 },
  segmentBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentBtnActive: { backgroundColor: 'rgba(30,136,229,0.25)' },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.white },
  repeatHint: { color: colors.textMuted, fontSize: 11, marginTop: -4, marginBottom: 10 },
  pickerField: { justifyContent: 'center' },
  pickerFieldText: { color: colors.text, fontSize: 14 },
  pickerWrap: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, marginBottom: 10, paddingHorizontal: 6, paddingTop: 2,
  },
  pickerDone: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  pickerDoneText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  unitRow: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  unitBtn: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.bgInput },
  unitBtnActive: { backgroundColor: 'rgba(30,136,229,0.25)', borderColor: colors.primary },
  unitBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  unitBtnTextActive: { color: colors.white },
  fieldLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 7 },
  inlineInputRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch' },
  compactToggle: { flexDirection: 'row', backgroundColor: colors.bgPill, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 3 },
  compactBtn: { minWidth: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  compactBtnActive: { backgroundColor: 'rgba(30,136,229,0.25)' },
  compactText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  compactTextActive: { color: colors.white },
  resultPanel: { minHeight: 78, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  resultRow: { minHeight: 31, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  resultLabel: { color: colors.textMuted, fontSize: 13, flexShrink: 0 },
  // flex: 1 lets long values wrap inside the panel instead of overflowing it.
  resultValue: { color: colors.primary, fontSize: 16, fontWeight: '700', textAlign: 'right', flex: 1 },
  copyHint: { color: colors.textFaint, fontSize: 10, textAlign: 'center', marginTop: 8 },
  resultEmpty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 8 },

  gaugeRow: { flexDirection: 'row', marginTop: 18, marginBottom: 4, gap: 20 },
  gaugeScaleArea: { width: 86, height: GAUGE_HEIGHT },
  gaugeTickRow: { position: 'absolute', left: 0, height: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  gaugeTickLabel: { width: 24, textAlign: 'right', color: colors.textFaint, fontSize: 10, fontVariant: ['tabular-nums'] },
  gaugeTickLine: { width: 8, height: 1, backgroundColor: colors.borderSubtle },
  gaugeTickLineMajor: { width: 14, height: 1.5, backgroundColor: colors.border },
  gaugeTrack: {
    position: 'absolute', left: 54, top: 0, bottom: 0, width: 30,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, overflow: 'hidden',
  },
  gaugeFill: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(30,136,229,0.35)' },
  gaugeFillOver: { backgroundColor: 'rgba(255,140,0,0.30)' },
  gaugeMarker: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: colors.primary },
  gaugeMarkerOver: { backgroundColor: colors.accent },
  gaugeReadout: { flex: 1, justifyContent: 'center', gap: 4 },
  gaugeUnitsBig: { color: colors.primary, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  gaugeUnitsBigOver: { color: colors.accent },
  gaugeLine: { color: colors.text, fontSize: 14, fontWeight: '600' },
  gaugeMass: { color: colors.textMuted, fontSize: 13 },
  gaugeScaleCaption: { color: colors.textFaint, fontSize: 11, marginTop: 6 },
  gaugeOverText: { color: colors.accent, fontSize: 11, lineHeight: 16, marginTop: 6 },
  gaugeNote: { color: colors.textFaint, fontSize: 10, lineHeight: 15, marginTop: 12, textAlign: 'center' },
  referenceText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  calculatorFootnote: { color: colors.textFaint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.lg },
});
