import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
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

type ToolId = 'schedule' | 'inventory' | 'templates' | 'conversion' | 'export' | 'settings';

const TOOLS: { id: ToolId; icon: string; title: string; sub: string; pro?: boolean }[] = [
  { id: 'schedule', icon: '📅', title: 'Schedule & Reminders', sub: 'Create your own dated reminders', pro: true },
  { id: 'inventory', icon: '📦', title: 'Inventory', sub: 'Track quantities, dates, and low-stock levels', pro: true },
  { id: 'templates', icon: '📝', title: 'Record Templates', sub: 'Save reusable labels and note prompts', pro: true },
  { id: 'conversion', icon: '▱', title: 'Concentration Worksheet', sub: 'Calculate concentration from entered mass and volume', pro: true },
  { id: 'export', icon: '⇪', title: 'Export Data (CSV)', sub: 'Share all saved records as a spreadsheet file' },
  { id: 'settings', icon: '⚙', title: 'Settings & Access', sub: 'Profile, Pro access, local data, and legal information' },
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
  const canUsePro = hasPro || !!user?.isDeveloper;

  const runExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const { count } = await exportInjectionsCsv();
      if (count === 0) {
        Alert.alert('Nothing to export', 'Save an injection record first, then export it here.');
      }
    } catch (error: any) {
      Alert.alert('Export failed', error?.message || 'Please try again.');
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
      <Header title="Tools" subtitle="Manual research organization" />
      <ScrollView contentContainerStyle={s.pageContent}>
        {TOOLS.map(tool => (
          <Pressable
            key={tool.id}
            style={s.toolRow}
            onPress={() => openTool(tool)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tool.title}`}
          >
            <Text style={s.toolIcon}>{tool.icon}</Text>
            <View style={{ flex: 1 }}>
              <View style={s.toolTitleRow}>
                <Text style={s.toolTitle}>{tool.title}</Text>
                {!!tool.pro && <Text style={s.proBadge}>PRO</Text>}
              </View>
              <Text style={s.toolSub}>{tool.sub}</Text>
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
  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <View style={s.toolHeader}>
        <Pressable style={s.backBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close tool">
          <Text style={s.backText}>‹ Tools</Text>
        </Pressable>
        <Text style={s.toolHeaderTitle}>{title}</Text>
        <View style={s.backBtn} />
      </View>
      {children}
    </SafeAreaView>
  );
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function repeatWeekdayName(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : WEEKDAY_NAMES[parsed.getDay()];
}

function ScheduleTool({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ScheduleEntry[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [repeat, setRepeat] = useState<ScheduleRepeat>('once');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const refresh = () => getSchedules().then(values => setItems(values.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))));
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!title.trim() || !isValidDate(date) || !isValidTime(time)) {
      Alert.alert('Check entry', 'Enter a title, date as YYYY-MM-DD, and time as HH:MM.');
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
        Alert.alert('Entry saved without reminder', error?.message || 'The reminder could not be scheduled.');
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
    <ToolShell title="Schedule Organizer" onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text="Entries are created entirely by you. This organizer does not suggest timing, amounts, or changes." />
        <Card>
          <CardLabel icon="＋">NEW SCHEDULE ENTRY</CardLabel>
          <Field value={title} setValue={setTitle} placeholder="Entry title" />
          <View style={s.twoCol}>
            <Field value={date} setValue={setDate} placeholder="YYYY-MM-DD" style={{ flex: 1 }} />
            <Field value={time} setValue={setTime} placeholder="HH:MM" style={{ flex: 1 }} />
          </View>
          <Field value={notes} setValue={setNotes} placeholder="Optional notes" multiline />
          <View style={s.segment}>
            {(['once', 'daily', 'weekly'] as const).map(option => (
              <SegmentButton
                key={option}
                label={option === 'once' ? 'Once' : option === 'daily' ? 'Daily' : 'Weekly'}
                active={repeat === option}
                onPress={() => setRepeat(option)}
              />
            ))}
          </View>
          {repeat !== 'once' && (
            <Text style={s.repeatHint}>
              {repeat === 'daily'
                ? `Repeats every day at ${time}.`
                : `Repeats every ${repeatWeekdayName(date) || 'week'} at ${time}.`}
            </Text>
          )}
          <View style={s.reminderToggle}>
            <View style={{ flex: 1 }}>
              <Text style={s.reminderToggleTitle}>Local reminder</Text>
              <Text style={s.reminderToggleSub}>Notify at the date and time you entered</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: 'rgba(120,130,150,0.4)', true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
          <PrimaryButton label="Add Entry" onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📅">YOUR SCHEDULE</CardLabel>
          {items.length === 0 ? <Empty text="No schedule entries yet" /> : items.map(item => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={`${item.date} · ${item.time}${item.repeat === 'daily' ? ' · Repeats daily' : item.repeat === 'weekly' ? ` · Repeats every ${repeatWeekdayName(item.date) || 'week'}` : ''}${item.completedAt ? ' · Completed' : item.reminderEnabled ? ' · Reminder on' : ''}${item.notes ? `\n${item.notes}` : ''}`}
              accent={item.completedAt ? colors.teal : undefined}
              actions={(!item.repeat || item.repeat === 'once') ? (
                <Pressable style={s.completeBtn} onPress={() => toggleComplete(item)}>
                  <Text style={s.completeBtnText}>{item.completedAt ? 'Undo' : 'Done'}</Text>
                </Pressable>
              ) : undefined}
              onDelete={() => confirmDelete('schedule entry', () => remove(item))}
            />
          ))}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

function InventoryTool({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [received, setReceived] = useState('');
  const [expiration, setExpiration] = useState('');
  const [lowAt, setLowAt] = useState('');
  const [notes, setNotes] = useState('');
  const refresh = () => getInventory().then(setItems);
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    const qty = Number(quantity);
    const lowStockAt = lowAt.trim() ? Number(lowAt) : undefined;
    if (!name.trim() || !unit.trim() || !Number.isFinite(qty) || qty < 0) {
      Alert.alert('Check item', 'Enter an item name, quantity, and unit.');
      return;
    }
    if (lowStockAt !== undefined && (!Number.isFinite(lowStockAt) || lowStockAt < 0)) {
      Alert.alert('Check item', 'Low-stock level must be zero or a positive number.');
      return;
    }
    if ((received.trim() && !isValidDate(received.trim())) || (expiration.trim() && !isValidDate(expiration.trim()))) {
      Alert.alert('Check dates', 'Enter dates as YYYY-MM-DD.');
      return;
    }
    await saveInventoryItem({
      name: name.trim(), quantity: qty, unit: unit.trim(),
      receivedDate: received.trim() || undefined,
      expirationDate: expiration.trim() || undefined,
      lowStockAt,
      notes: notes.trim() || undefined,
    });
    setName(''); setQuantity(''); setUnit(''); setReceived(''); setExpiration(''); setLowAt(''); setNotes(''); refresh();
  };

  return (
    <ToolShell title="Inventory" onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Card>
          <CardLabel icon="＋">ADD INVENTORY ITEM</CardLabel>
          <Field value={name} setValue={setName} placeholder="Item name" />
          <View style={s.twoCol}>
            <Field value={quantity} setValue={setQuantity} placeholder="Quantity" keyboardType="decimal-pad" style={{ flex: 1 }} />
            <Field value={unit} setValue={setUnit} placeholder="Unit or container" style={{ flex: 1 }} />
          </View>
          <Field value={received} setValue={setReceived} placeholder="Date received (optional)" />
          <Field value={expiration} setValue={setExpiration} placeholder="Expiration date (optional)" />
          <Field value={lowAt} setValue={setLowAt} placeholder="Low-stock level (optional)" keyboardType="decimal-pad" />
          <Field value={notes} setValue={setNotes} placeholder="Optional notes" multiline />
          <PrimaryButton label="Add Item" onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📦">CURRENT INVENTORY</CardLabel>
          {items.length === 0 ? <Empty text="No inventory items yet" /> : items.map(item => {
            const low = item.lowStockAt !== undefined && item.quantity <= item.lowStockAt;
            return (
              <ListItem
                key={item.id}
                title={item.name}
                meta={`${item.quantity} ${item.unit}${low ? ' · Low stock' : ''}${item.expirationDate ? `\nExpires: ${item.expirationDate}` : ''}${item.notes ? `\n${item.notes}` : ''}`}
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
                onDelete={() => confirmDelete('inventory item', () => deleteInventoryItem(item.id).then(refresh))}
              />
            );
          })}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

function TemplatesTool({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<RecordTemplate[]>([]);
  const [title, setTitle] = useState('');
  const [compound, setCompound] = useState('');
  const [prompt, setPrompt] = useState('');
  const refresh = () => getRecordTemplates().then(setItems);
  useEffect(() => { refresh(); }, []);
  const add = async () => {
    if (!title.trim()) { Alert.alert('Missing title', 'Enter a template title.'); return; }
    await saveRecordTemplate({ title: title.trim(), compoundLabel: compound.trim() || undefined, notesPrompt: prompt.trim() || undefined });
    setTitle(''); setCompound(''); setPrompt(''); refresh();
  };
  return (
    <ToolShell title="Record Templates" onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text="Templates only reuse labels and note prompts. They never fill numeric fields or schedule entries." />
        <Card>
          <CardLabel icon="＋">NEW TEMPLATE</CardLabel>
          <Field value={title} setValue={setTitle} placeholder="Template title" />
          <Field value={compound} setValue={setCompound} placeholder="Optional compound label" />
          <Field value={prompt} setValue={setPrompt} placeholder="Optional notes prompt" multiline />
          <PrimaryButton label="Save Template" onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📝">SAVED TEMPLATES</CardLabel>
          {items.length === 0 ? <Empty text="No templates yet" /> : items.map(item => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={`${item.compoundLabel || 'No compound label'}${item.notesPrompt ? `\n${item.notesPrompt}` : ''}`}
              onDelete={() => confirmDelete('template', () => deleteRecordTemplate(item.id).then(refresh))}
            />
          ))}
        </Card>
      </ScrollView>
    </ToolShell>
  );
}

const KEY_WORKSHEET_INPUTS = '@mpp/worksheet_inputs';
const U100_MARKINGS = [1, 5, 10, 20, 50];

function ConversionTool({ onClose }: { onClose: () => void }) {
  const [solutionMass, setSolutionMass] = useState('');
  const [solutionMassUnit, setSolutionMassUnit] = useState('mg');
  const [liquidVolume, setLiquidVolume] = useState('');
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
      })
      .catch(() => undefined)
      .finally(() => { hydrated.current = true; });
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    AsyncStorage.setItem(
      KEY_WORKSHEET_INPUTS,
      JSON.stringify({ mass: solutionMass, unit: solutionMassUnit, volume: liquidVolume }),
    ).catch(() => undefined);
  }, [solutionMass, solutionMassUnit, liquidVolume]);

  const copyText = async (key: string, text: string) => {
    try {
      await Clipboard.setStringAsync(text);
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
        { label: 'Concentration', value: `${formatNumber(massMg / volume)} mg/mL` },
        { label: 'Concentration', value: `${formatNumber((massMg * 1000) / volume)} mcg/mL` },
      ],
      u100: [
        { label: 'Entered volume', value: `${formatNumber(totalU100Units)} U-100 units` },
        ...U100_MARKINGS.map(units => ({
          label: `${units} unit${units === 1 ? '' : 's'} =`,
          value: formatMass(mcgPerUnit * units),
        })),
      ],
    };
  }, [liquidVolume, solutionMass, solutionMassUnit]);

  const summaryText = worksheetResults.concentration.length === 0 ? null : [
    'Monarch Prime Pin — Concentration Worksheet',
    `Entered: ${solutionMass} ${solutionMassUnit} total mass in ${liquidVolume} mL`,
    ...worksheetResults.concentration.map(result => `${result.label}: ${result.value}`),
    ...worksheetResults.u100.map(result => `${result.label}: ${result.value}`),
    'For research organization only. Verify all values independently.',
  ].join('\n');

  return (
    <ToolShell title="Concentration Worksheet" onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text="This worksheet only calculates concentration and U-100 marking references from values you enter. It does not recommend a target amount, schedule, or protocol." />
        <Card>
          <CardLabel icon="▱">SOLUTION CONCENTRATION</CardLabel>
          <Text style={s.fieldLabel}>TOTAL MASS (VIAL)</Text>
          <View style={s.inlineInputRow}>
            <Field value={solutionMass} setValue={setSolutionMass} placeholder="Total amount in vial" keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
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
          <Text style={[s.fieldLabel, { marginTop: 14 }]}>LIQUID VOLUME (mL)</Text>
          <Field value={liquidVolume} setValue={setLiquidVolume} placeholder="Enter liquid volume in mL" keyboardType="decimal-pad" />
          <View style={s.resultPanel}>
            {worksheetResults.concentration.length > 0 ? worksheetResults.concentration.map((result, index) => {
              const rowKey = `conc-${index}`;
              return (
                <Pressable key={rowKey} style={s.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={s.resultLabel}>{copiedKey === rowKey ? 'Copied ✓' : result.label}</Text>
                  <Text style={s.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={s.resultEmpty}>Enter mass and liquid volume to view concentration</Text>
            )}
          </View>
          {worksheetResults.concentration.length > 0 && (
            <Text style={s.copyHint}>Tap any result to copy it</Text>
          )}
        </Card>

        <Card>
          <CardLabel icon="▱">U-100 MARKING REFERENCE</CardLabel>
          <Text style={s.referenceText}>
            Standard U-100 insulin syringe markings use 100 units per 1 mL. This reference only converts the liquid volume you entered into syringe unit markings and shows how much mass each marking represents, in both mg and mcg.
          </Text>
          <View style={s.resultPanel}>
            {worksheetResults.u100.length > 0 ? worksheetResults.u100.map((result, index) => {
              const rowKey = `u100-${index}`;
              return (
                <Pressable key={rowKey} style={s.resultRow} onPress={() => copyText(rowKey, result.value)}>
                  <Text style={s.resultLabel}>{copiedKey === rowKey ? 'Copied ✓' : result.label}</Text>
                  <Text style={s.resultValue}>{result.value}</Text>
                </Pressable>
              );
            }) : (
              <Text style={s.resultEmpty}>Enter mass and liquid volume to view U-100 reference</Text>
            )}
          </View>
          {!!summaryText && (
            <Pressable
              style={[s.primaryBtn, { marginTop: 12 }]}
              onPress={() => copyText('summary', summaryText)}
            >
              <Text style={s.primaryBtnText}>
                {copiedKey === 'summary' ? 'Copied ✓' : 'Copy Worksheet Summary'}
              </Text>
            </Pressable>
          )}
        </Card>

        <Text style={s.calculatorFootnote}>
          Calculations: concentration = entered total mass ÷ entered liquid volume. U-100 reference = entered mL × 100, with each marking shown in the clearest unit. Verify all entered values and results independently.
        </Text>
      </ScrollView>
    </ToolShell>
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
function confirmDelete(label: string, action: () => void) {
  Alert.alert(`Delete ${label}?`, 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: action }]);
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  pageContent: { paddingHorizontal: spacing.xl, paddingBottom: 110, gap: 10 },
  toolRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14 },
  toolIcon: { width: 42, color: colors.primary, fontSize: 22, fontWeight: '700' },
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
  referenceText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  calculatorFootnote: { color: colors.textFaint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.lg },
});
