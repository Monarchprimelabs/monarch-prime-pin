import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, CardLabel, Disclaimer, Header } from '../components/UI';
import { colors, radius, spacing } from '../theme';
import {
  deleteInventoryItem, deleteRecordTemplate, deleteSchedule,
  getInventory, getRecordTemplates, getSchedules,
  InventoryItem, RecordTemplate, saveInventoryItem, saveRecordTemplate,
  saveSchedule, ScheduleEntry, updateInventoryItem,
} from '../lib/storage';
import { SettingsScreen } from './SettingsScreen';

type ToolId = 'schedule' | 'inventory' | 'templates' | 'conversion' | 'settings';

const TOOLS: { id: ToolId; icon: string; title: string; sub: string }[] = [
  { id: 'schedule', icon: '📅', title: 'Schedule Organizer', sub: 'Create your own dated research reminders' },
  { id: 'inventory', icon: '📦', title: 'Inventory', sub: 'Track quantities, dates, and low-stock levels' },
  { id: 'templates', icon: '📝', title: 'Record Templates', sub: 'Save reusable labels and note prompts' },
  { id: 'conversion', icon: '▱', title: 'Solution Calculator', sub: 'Calculate concentration from entered values' },
  { id: 'settings', icon: '⚙', title: 'Settings', sub: 'Profile, local data, and legal information' },
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
  const [active, setActive] = useState<ToolId | null>(null);
  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Tools" subtitle="Manual research organization" />
      <ScrollView contentContainerStyle={s.pageContent}>
        {TOOLS.map(tool => (
          <Pressable
            key={tool.id}
            style={s.toolRow}
            onPress={() => setActive(tool.id)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${tool.title}`}
          >
            <Text style={s.toolIcon}>{tool.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.toolTitle}>{tool.title}</Text>
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

function ScheduleTool({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<ScheduleEntry[]>([]);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const refresh = () => getSchedules().then(values => setItems(values.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))));
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    if (!title.trim() || !isValidDate(date) || !isValidTime(time)) {
      Alert.alert('Check entry', 'Enter a title, date as YYYY-MM-DD, and time as HH:MM.');
      return;
    }
    await saveSchedule({ title: title.trim(), date, time, notes: notes.trim() || undefined });
    setTitle(''); setNotes(''); refresh();
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
          <PrimaryButton label="Add Entry" onPress={add} />
        </Card>
        <Card>
          <CardLabel icon="📅">YOUR SCHEDULE</CardLabel>
          {items.length === 0 ? <Empty text="No schedule entries yet" /> : items.map(item => (
            <ListItem
              key={item.id}
              title={item.title}
              meta={`${item.date} · ${item.time}${item.notes ? `\n${item.notes}` : ''}`}
              onDelete={() => confirmDelete('schedule entry', () => deleteSchedule(item.id).then(refresh))}
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

function ConversionTool({ onClose }: { onClose: () => void }) {
  const [solutionMass, setSolutionMass] = useState('');
  const [solutionMassUnit, setSolutionMassUnit] = useState('mg');
  const [liquidVolume, setLiquidVolume] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetUnit, setTargetUnit] = useState('mcg');
  const [syringeMax, setSyringeMax] = useState(100);

  const concentrationResults = useMemo(() => {
    const mass = parsePositiveNumber(solutionMass);
    const volume = parsePositiveNumber(liquidVolume);
    if (!mass || !volume) return [];
    const massMg = solutionMassUnit === 'mg' ? mass : mass / 1000;
    return [
      { label: 'Concentration', value: `${formatNumber(massMg / volume)} mg/mL` },
      { label: 'Concentration', value: `${formatNumber((massMg * 1000) / volume)} mcg/mL` },
    ];
  }, [liquidVolume, solutionMass, solutionMassUnit]);

  const volumeResults = useMemo(() => {
    const mass = parsePositiveNumber(solutionMass);
    const volume = parsePositiveNumber(liquidVolume);
    const target = parsePositiveNumber(targetAmount);
    if (!mass || !volume || !target) return null;
    const massMg = solutionMassUnit === 'mg' ? mass : mass / 1000;
    const targetMg = targetUnit === 'mg' ? target : target / 1000;
    const concentration = massMg / volume;
    const volumeRequired = targetMg / concentration;
    const units = volumeRequired * 100;
    const portions = Math.floor(massMg / targetMg);
    return {
      volumeRequired,
      units,
      portions,
      exceedsSolution: targetMg > massMg,
      exceedsSyringe: units > syringeMax,
    };
  }, [solutionMass, solutionMassUnit, liquidVolume, targetAmount, targetUnit, syringeMax]);

  return (
    <ToolShell title="Solution Calculator" onClose={onClose}>
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text="Reference calculator only. It displays unit-conversion math from manually entered values and does not connect to saved records or schedules. It does not suggest or recommend any amount." />
        <Card>
          <CardLabel icon="▱">SOLUTION CONCENTRATION</CardLabel>
          <Text style={s.fieldLabel}>TOTAL MASS</Text>
          <View style={s.inlineInputRow}>
            <Field value={solutionMass} setValue={setSolutionMass} placeholder="Enter amount" keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
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
          <Text style={[s.fieldLabel, { marginTop: 14 }]}>LIQUID VOLUME</Text>
          <Field value={liquidVolume} setValue={setLiquidVolume} placeholder="Enter liquid volume" keyboardType="decimal-pad" />
          <View style={s.resultPanel}>
            {concentrationResults.length > 0 ? concentrationResults.map((result, index) => (
              <View key={`${result.value}-${index}`} style={s.resultRow}>
                <Text style={s.resultLabel}>{result.label}</Text>
                <Text style={s.resultValue}>{result.value}</Text>
              </View>
            )) : (
              <Text style={s.resultEmpty}>Enter mass and liquid volume to view concentration</Text>
            )}
          </View>
        </Card>

        <Card>
          <CardLabel icon="▱">VOLUME CONVERSION</CardLabel>
          <Text style={s.fieldLabel}>TARGET AMOUNT</Text>
          <View style={s.inlineInputRow}>
            <Field value={targetAmount} setValue={setTargetAmount} placeholder="Enter amount" keyboardType="decimal-pad" style={{ flex: 1, marginBottom: 0 }} />
            <View style={s.compactToggle}>
              {[{ id: 'mcg', label: 'mcg' }, { id: 'mg', label: 'mg' }].map(option => (
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
          <Text style={[s.fieldLabel, { marginTop: 14 }]}>SYRINGE</Text>
          <Text style={s.syringeCaption}>U-100 scale · 100 units = 1 mL</Text>
          <View style={s.compactToggle}>
            {[{ v: 100, label: '1.0 mL · 100u' }, { v: 50, label: '0.5 mL · 50u' }, { v: 30, label: '0.3 mL · 30u' }].map(option => (
              <Pressable
                key={option.v}
                style={[s.compactBtn, { flex: 1 }, syringeMax === option.v && s.compactBtnActive]}
                onPress={() => setSyringeMax(option.v)}
              >
                <Text style={[s.compactText, syringeMax === option.v && s.compactTextActive]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={s.resultPanel}>
            {volumeResults ? (
              <>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Volume required</Text>
                  <Text style={s.resultValue}>{formatNumber(volumeResults.volumeRequired)} mL</Text>
                </View>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Syringe units</Text>
                  <Text style={s.resultValue}>{formatNumber(volumeResults.units)} units</Text>
                </View>
                <View style={s.resultRow}>
                  <Text style={s.resultLabel}>Portions per solution (theoretical)</Text>
                  <Text style={s.resultValue}>{volumeResults.portions}</Text>
                </View>
                {volumeResults.exceedsSolution && (
                  <Text style={s.resultWarn}>Target amount exceeds the total mass entered for the solution.</Text>
                )}
                {!volumeResults.exceedsSolution && volumeResults.exceedsSyringe && (
                  <Text style={s.resultWarn}>Result exceeds the selected syringe capacity ({syringeMax} units).</Text>
                )}
              </>
            ) : (
              <Text style={s.resultEmpty}>Enter solution values above and a target amount to convert</Text>
            )}
          </View>
        </Card>

        <Text style={s.calculatorFootnote}>
          Calculation: concentration = entered mass ÷ entered liquid volume; volume required = target amount ÷ concentration; units = volume × 100 (U-100 scale). Verify all entered values and results independently.
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

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(value);
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
  toolTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 3 },
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
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  segment: { flexDirection: 'row', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 3, marginBottom: 10 },
  segmentBtn: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  segmentBtnActive: { backgroundColor: 'rgba(30,136,229,0.25)' },
  segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  segmentTextActive: { color: colors.white },
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
  resultLabel: { color: colors.textMuted, fontSize: 13 },
  resultValue: { color: colors.primary, fontSize: 16, fontWeight: '700', textAlign: 'right' },
  resultEmpty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  syringeCaption: { color: colors.textFaint, fontSize: 11, marginBottom: spacing.sm },
  resultWarn: { color: colors.accentLight, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  calculatorFootnote: { color: colors.textFaint, fontSize: 10, lineHeight: 15, textAlign: 'center', marginHorizontal: spacing.xl, marginBottom: spacing.lg },
});
