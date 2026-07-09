import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  TextInput, Image, Alert, Modal, FlatList,
  Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Disclaimer, Header, Card, CardLabel, ViewPill } from '../components/UI';
import { BodyDiagram } from '../components/BodyDiagram';
import { colors, spacing, radius, severity as sevColors } from '../theme';
import { PEPTIDES, ALL_ZONES, Injection, Peptide, Severity, SIDE_EFFECT_TAGS, TIME_PERIODS, TimePeriod, formatClockTime } from '../data/peptides';
import { getInjections, getInventory, getRecordTemplates, RecordTemplate, saveInjection, updateInjection, updateInventoryItem, uploadPhoto } from '../lib/storage';
import { getInjectionSiteIds } from '../lib/sites';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { useAuth } from '../lib/auth';
import { UpgradeScreen } from './UpgradeScreen';
import { notifySuccessfulSave } from '../lib/reviewPrompt';
import { hapticSuccess, hapticTap } from '../lib/haptics';

type LogInjectionScreenProps = {
  onDone: () => void;
  initialDate?: string;
  initialInjection?: Injection;
  /** Seed compound/dose/sites/weight from an existing record while still creating a NEW record. */
  prefillFrom?: Injection;
  onCancel?: () => void;
};

type TimeChoice =
  | { kind: 'now' }
  | { kind: 'period'; period: TimePeriod }
  | { kind: 'custom' };

export function LogInjectionScreen({ onDone, initialDate, initialInjection, prefillFrom, onCancel }: LogInjectionScreenProps) {
  const { hasPro, monetizationEnabled } = useEntitlements();
  const { user } = useAuth();
  const seedRecord = initialInjection ?? prefillFrom ?? null;
  const initialPeptide = seedRecord
    ? [...PEPTIDES.singles, ...PEPTIDES.blends].find(p => p.name === seedRecord.peptide)
      ?? { id: 'existing-custom', name: seedRecord.peptide, defaultUnit: seedRecord.unit }
    : null;
  const initialSites = seedRecord ? getInjectionSiteIds(seedRecord) : [];

  const [peptide, setPeptide] = useState<Peptide | null>(initialPeptide);
  const [picker, setPicker] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<RecordTemplate[]>([]);
  const [dose, setDose] = useState(seedRecord?.dose ?? '');
  const [unit, setUnit] = useState<'mcg' | 'mg'>(seedRecord?.unit ?? 'mcg');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<string[]>(initialSites);
  const [sev, setSev] = useState<Severity>(initialInjection?.sev ?? 'none');
  const [symptoms, setSymptoms] = useState<string[]>(initialInjection?.symptoms ?? []);
  const [weight, setWeight] = useState(seedRecord?.weight ? String(seedRecord.weight) : '');
  const [notes, setNotes] = useState(initialInjection?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialInjection?.photoUri ?? null);
  // Editing keeps the record's stored time (period chip or exact clock time);
  // new records default to "Now" so quick logging stays one-tap.
  const [timeChoice, setTimeChoice] = useState<TimeChoice>(
    initialInjection
      ? initialInjection.timePeriod
        ? { kind: 'period', period: initialInjection.timePeriod }
        : { kind: 'custom' }
      : { kind: 'now' },
  );
  const seedTime = initialInjection?.time ?? new Date().toTimeString().slice(0, 5);
  const seedHour = Number(seedTime.slice(0, 2));
  const [customHour, setCustomHour] = useState(String(seedHour % 12 === 0 ? 12 : seedHour % 12));
  const [customMinute, setCustomMinute] = useState(seedTime.slice(3, 5));
  const [customMeridiem, setCustomMeridiem] = useState<'AM' | 'PM'>(seedHour >= 12 ? 'PM' : 'AM');
  const [saving, setSaving] = useState(false);
  const [freeLogCount, setFreeLogCount] = useState<number | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const isEditing = !!initialInjection;
  const logDate = initialInjection?.date ?? initialDate ?? new Date().toISOString().slice(0, 10);
  const canUsePro = hasPro || !!user?.isDeveloper;
  const freeTrialActive = monetizationEnabled && !canUsePro && !isEditing;
  const freeLogsRemaining = freeLogCount === null
    ? FREE_INJECTION_LIMIT
    : Math.max(0, FREE_INJECTION_LIMIT - freeLogCount);

  useEffect(() => {
    let active = true;
    if (!freeTrialActive) {
      setFreeLogCount(null);
      return () => { active = false; };
    }
    getInjections()
      .then(records => { if (active) setFreeLogCount(records.length); })
      .catch(() => { if (active) setFreeLogCount(0); });
    return () => { active = false; };
  }, [freeTrialActive]);

  const toggle = (id: string) => {
    hapticTap();
    setSelected(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  };

  const toggleSymptom = (tag: string) =>
    setSymptoms(p => (p.includes(tag) ? p.filter(x => x !== tag) : [...p, tag]));

  const handleUnitChange = (u: 'mcg' | 'mg') => {
    setUnit(u);
    setDose('');
  };

  const handlePeptideSelect = (p: Peptide) => {
    setPeptide(p);
    if (p.defaultUnit) setUnit(p.defaultUnit);
    setPicker(false);
  };

  const openTemplates = async () => {
    setTemplates(await getRecordTemplates());
    setTemplatePicker(true);
  };

  const applyTemplate = (template: RecordTemplate) => {
    if (template.compoundLabel) {
      setPeptide({ id: `template-${template.id}`, name: template.compoundLabel, defaultUnit: unit });
    }
    if (template.notesPrompt) setNotes(template.notesPrompt);
    setTemplatePicker(false);
  };

  // ============================================================
  // PHOTO PICKER — requests permission, opens library or camera
  // ============================================================
  const pickPhoto = async () => {
    Alert.alert(
      'Add Progress Photo',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: choosePhoto },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  };

  const choosePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Monarch Prime Pin needs photo library access to attach progress photos. You can enable this in Settings.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Monarch Prime Pin needs camera access to capture progress photos. You can enable this in Settings.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const resolveRecordTime = (): { time: string; timePeriod?: TimePeriod } | null => {
    if (timeChoice.kind === 'period') {
      const period = TIME_PERIODS.find(p => p.id === timeChoice.period);
      if (!period) return null;
      return { time: period.time, timePeriod: period.id };
    }
    if (timeChoice.kind === 'custom') {
      const hour = Number(customHour);
      const minute = Number(customMinute);
      if (!Number.isInteger(hour) || hour < 1 || hour > 12) return null;
      if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
      const hour24 = customMeridiem === 'PM' ? (hour % 12) + 12 : hour % 12;
      return { time: `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}` };
    }
    return { time: new Date().toTimeString().slice(0, 5) };
  };

  // ============================================================
  // SAVE — actually persists the injection now
  // ============================================================
  const handleSave = async () => {
    if (!peptide) {
      Alert.alert('Missing peptide', 'Please select a peptide.');
      return;
    }
    if (!dose) {
      Alert.alert('Missing dose', 'Please enter a dose.');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Missing site', 'Please select at least one injection site.');
      return;
    }
    const resolvedTime = resolveRecordTime();
    if (!resolvedTime) {
      Alert.alert('Check the time', 'Enter an hour from 1 to 12 and minutes from 00 to 59.');
      return;
    }

    let freeTrialSaveNumber: number | null = null;
    if (freeTrialActive) {
      try {
        const existing = await getInjections();
        if (existing.length >= FREE_INJECTION_LIMIT) {
          setFreeLogCount(existing.length);
          setUpgradeOpen(true);
          return;
        }
        freeTrialSaveNumber = existing.length + 1;
      } catch (e: any) {
        Alert.alert('Unable to check access', e?.message || 'Please try again.');
        return;
      }
    }

    setSaving(true);
    try {
      let uploadedPhotoUri = initialInjection?.photoUri;
      if (photoUri) {
        uploadedPhotoUri = photoUri === initialInjection?.photoUri
          ? photoUri
          : await uploadPhoto(photoUri);
      } else {
        uploadedPhotoUri = undefined;
      }

      const record = {
        peptide: peptide.name,
        dose,
        unit,
        date: logDate,
        time: resolvedTime.time,
        timePeriod: resolvedTime.timePeriod,
        site: selected.map(id => { const z = ALL_ZONES.find(x => x.id === id); return z ? z.label : id; }).join(", "),
        sev,
        symptoms: symptoms.length ? symptoms : undefined,
        weight: weight ? Number(weight) : 0,
        notes: notes || undefined,
        photoUri: uploadedPhotoUri,
      };

      if (initialInjection) {
        await updateInjection({ ...record, id: initialInjection.id });
      } else {
        await saveInjection(record);
      }

      const freeLogsLeftAfterSave = freeTrialSaveNumber ? FREE_INJECTION_LIMIT - freeTrialSaveNumber : 0;
      const savedMessage = isEditing
        ? 'Your changes have been saved.'
        : freeTrialSaveNumber
          ? freeTrialSaveNumber >= FREE_INJECTION_LIMIT
            ? `Your free log has been saved. Unlock unlimited usage for ${LIFETIME_PRO_PRICE_LABEL} whenever you are ready.`
            : `Your free log has been saved. You have ${freeLogsLeftAfterSave} free log${freeLogsLeftAfterSave === 1 ? '' : 's'} remaining.`
          : 'Your injection has been logged.';

      hapticSuccess();
      if (!isEditing) {
        notifySuccessfulSave();
      }

      const finishSave = () => {
        setPeptide(null);
        setDose('');
        setSelected([]);
        setSev('none');
        setWeight('');
        setNotes('');
        setPhotoUri(null);
        onDone();
      };

      // Offer to deduct 1 from a matching inventory item (new records only,
      // single unambiguous name match, never blocks the save).
      const offerInventoryDeduction = async () => {
        try {
          const items = await getInventory();
          const wanted = peptide.name.trim().toLowerCase();
          const matches = items.filter(item => item.name.trim().toLowerCase() === wanted);
          const match = matches.length === 1 ? matches[0] : undefined;
          if (!match || match.quantity <= 0) {
            finishSave();
            return;
          }
          Alert.alert(
            'Update inventory?',
            `${match.name}: ${match.quantity} ${match.unit} on hand. Deduct 1 for this record?`,
            [
              { text: 'Not Now', style: 'cancel', onPress: finishSave },
              { text: 'Deduct 1', onPress: async () => {
                try {
                  await updateInventoryItem({ ...match, quantity: Math.max(0, match.quantity - 1) });
                } catch {
                  // Inventory update is best-effort; the record is already saved.
                }
                finishSave();
              }},
            ],
          );
        } catch {
          finishSave();
        }
      };

      Alert.alert(isEditing ? 'Record updated' : 'Saved!', savedMessage, [
        { text: 'OK', onPress: () => {
          if (isEditing) {
            finishSave();
          } else {
            offerInventoryDeduction();
          }
        }},
      ]);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (freeTrialActive && freeLogCount !== null && freeLogCount >= FREE_INJECTION_LIMIT) {
    return <UpgradeScreen onClose={onCancel || onDone} />;
  }

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }} keyboardShouldPersistTaps="handled">
        <Header
          title={isEditing ? 'Edit Record' : 'Log Injection'}
          subtitle={
            (initialDate
              ? new Date(initialDate + 'T12:00:00')
              : new Date()
            ).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            + (initialDate ? ' · Backdated Entry' : '')
          }
        />
        {!!onCancel && (
          <View style={s.cancelRow}>
            <Pressable
              onPress={onCancel}
              style={s.cancelBtn}
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Cancel editing record' : 'Close logging form'}
            >
              <Text style={s.cancelBtnText}>‹ {isEditing ? 'Record Details' : 'History'}</Text>
            </Pressable>
          </View>
        )}
        {freeTrialActive && freeLogCount !== null && (
          <Card style={s.trialCard}>
            <CardLabel icon="◆">FREE TRIAL</CardLabel>
            <Text style={s.trialTitle}>
              {freeLogsRemaining} of {FREE_INJECTION_LIMIT} free logs remaining
            </Text>
            <Text style={s.trialBody}>
              Try the tracker with {FREE_INJECTION_LIMIT} saved injection records. Unlock unlimited usage for {LIFETIME_PRO_PRICE_LABEL}.
            </Text>
          </Card>
        )}

        {/* Peptide selector */}
        <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
          <Pressable
            style={s.peptideBtn}
            onPress={() => setPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={peptide ? `Selected compound: ${peptide.name}. Change selection` : 'Select compound'}
          >
            <Text style={peptide ? s.peptideName : s.peptidePlaceholder}>
              {peptide ? peptide.name : 'Select peptide…'}
            </Text>
            <Text style={s.chev}>›</Text>
          </Pressable>
          <Pressable
            style={s.templateBtn}
            onPress={freeTrialActive ? () => setUpgradeOpen(true) : openTemplates}
            accessibilityRole="button"
            accessibilityLabel="Use a saved record template"
          >
            <Text style={s.templateBtnText}>{freeTrialActive ? 'Unlock Record Templates' : 'Use Record Template'}</Text>
          </Pressable>
        </View>

        {/* Dose */}
        <Card>
          <Text style={s.cardLabel}>DOSE</Text>
          <View style={s.doseRow}>
            <TextInput
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              value={dose}
              onChangeText={setDose}
              keyboardType="numeric"
              style={s.doseInput}
            />
            <View style={s.unitToggle}>
              {(['mcg', 'mg'] as const).map(u => (
                <Pressable
                  key={u}
                  onPress={() => handleUnitChange(u)}
                  style={[s.unitBtn, unit === u && s.unitBtnActive]}
                >
                  <Text style={[s.unitBtnText, unit === u && s.unitBtnTextActive]}>{u}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Card>

        {/* Time */}
        <Card>
          <Text style={s.cardLabel}>TIME</Text>
          <View style={s.timeChips}>
            <Pressable
              onPress={() => { hapticTap(); setTimeChoice({ kind: 'now' }); }}
              style={[s.timeChip, timeChoice.kind === 'now' && s.timeChipActive]}
              accessibilityRole="button"
              accessibilityLabel="Record the current time"
            >
              <Text style={[s.timeChipText, timeChoice.kind === 'now' && s.timeChipTextActive]}>Now</Text>
            </Pressable>
            {TIME_PERIODS.map(period => {
              const active = timeChoice.kind === 'period' && timeChoice.period === period.id;
              return (
                <Pressable
                  key={period.id}
                  onPress={() => { hapticTap(); setTimeChoice({ kind: 'period', period: period.id }); }}
                  style={[s.timeChip, active && s.timeChipActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Record time as ${period.label}`}
                >
                  <Text style={[s.timeChipText, active && s.timeChipTextActive]}>{period.label}</Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => { hapticTap(); setTimeChoice({ kind: 'custom' }); }}
              style={[s.timeChip, timeChoice.kind === 'custom' && s.timeChipActive]}
              accessibilityRole="button"
              accessibilityLabel="Enter an exact time"
            >
              <Text style={[s.timeChipText, timeChoice.kind === 'custom' && s.timeChipTextActive]}>Exact…</Text>
            </Pressable>
          </View>
          {timeChoice.kind === 'custom' && (
            <View style={s.customTimeRow}>
              <TextInput
                value={customHour}
                onChangeText={value => setCustomHour(value.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                style={s.customTimeInput}
                accessibilityLabel="Hour"
              />
              <Text style={s.customTimeColon}>:</Text>
              <TextInput
                value={customMinute}
                onChangeText={value => setCustomMinute(value.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
                style={s.customTimeInput}
                accessibilityLabel="Minutes"
              />
              <View style={s.unitToggle}>
                {(['AM', 'PM'] as const).map(m => (
                  <Pressable
                    key={m}
                    onPress={() => setCustomMeridiem(m)}
                    style={[s.unitBtn, customMeridiem === m && s.unitBtnActive]}
                  >
                    <Text style={[s.unitBtnText, customMeridiem === m && s.unitBtnTextActive]}>{m}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <Text style={s.timeHint}>
            {timeChoice.kind === 'now'
              ? `Records the time when you save (now ${formatClockTime(new Date().toTimeString().slice(0, 5))}).`
              : timeChoice.kind === 'period'
                ? `Shown as “${TIME_PERIODS.find(p => p.id === timeChoice.period)?.label}” in your history.`
                : 'Recorded exactly as entered.'}
          </Text>
        </Card>

        {/* Site */}
        <Card>
          <Text style={s.cardLabel}>INJECTION SITE</Text>
          <ViewPill view={view} setView={setView} />
          <BodyDiagram view={view} mode="select" selected={selected} onZoneTap={toggle} />
          <Text style={s.anteriorLabel}>{view === 'front' ? 'ANTERIOR' : 'POSTERIOR'}</Text>
          {selected.length > 0 && (
            <View style={s.chips}>
              {selected.map(id => {
                const z = ALL_ZONES.find(x => x.id === id);
                return (
                  <Pressable key={id} style={s.chip} onPress={() => toggle(id)}>
                    <Text style={s.chipText}>{z?.short} ×</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* Side effects */}
        <Card>
          <Text style={s.cardLabel}>SIDE EFFECTS</Text>
          <View style={s.sevRow}>
            {([
              { v: 'none' as const, label: 'None',     c: sevColors.none },
              { v: 'mild' as const, label: 'Mild',     c: sevColors.mild },
              { v: 'mod'  as const, label: 'Moderate', c: sevColors.mod },
              { v: 'sev'  as const, label: 'Severe',   c: sevColors.sev },
            ]).map(s2 => (
              <Pressable
                key={s2.v}
                onPress={() => setSev(s2.v)}
                style={[
                  s.sevBtn,
                  sev === s2.v && { borderColor: s2.c, backgroundColor: s2.c + '15' },
                ]}
              >
                <Text style={[s.sevBtnText, sev === s2.v && { color: s2.c }]}>{s2.label}</Text>
              </Pressable>
            ))}
          </View>
          {sev !== 'none' && (
            <View style={s.symptomWrap}>
              {SIDE_EFFECT_TAGS.map(tag => {
                const active = symptoms.includes(tag);
                return (
                  <Pressable
                    key={tag}
                    onPress={() => toggleSymptom(tag)}
                    style={[s.symptomChip, active && s.symptomChipActive]}
                  >
                    <Text style={[s.symptomChipText, active && s.symptomChipTextActive]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Card>

        {/* Photo */}
        <Card>
          <Text style={s.cardLabel}>PROGRESS PHOTO</Text>
          <Pressable style={s.photoArea} onPress={pickPhoto}>
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={s.photoImg} />
                <Pressable
                  onPress={() => setPhotoUri(null)}
                  style={s.photoRemove}
                >
                  <Text style={s.photoRemoveText}>Remove</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 32 }}>📷</Text>
                <Text style={s.photoText}>Tap to add progress photo</Text>
              </>
            )}
          </Pressable>
        </Card>

        {/* Weight */}
        <Card>
          <Text style={s.cardLabel}>WEIGHT (LBS)</Text>
          <TextInput
            placeholder="Enter weight…"
            placeholderTextColor={colors.textFaint}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            style={s.textInput}
          />
        </Card>

        {/* Notes */}
        <Card>
          <Text style={s.cardLabel}>NOTES</Text>
          <TextInput
            placeholder="Add notes…"
            placeholderTextColor={colors.textFaint}
            value={notes}
            onChangeText={setNotes}
            multiline
            style={s.notes}
          />
        </Card>

        <View style={{ paddingHorizontal: spacing.xl }}>
          <Pressable
            style={s.submit}
            onPress={handleSave}
            disabled={saving}
            accessibilityRole="button"
            accessibilityState={{ disabled: saving }}
          >
            <Text style={s.submitText}>{saving ? 'SAVING…' : isEditing ? 'SAVE CHANGES' : 'SAVE INJECTION'}</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Peptide picker modal */}
      <Modal visible={picker} animationType="slide" transparent onRequestClose={() => setPicker(false)}>
        <PeptidePickerSheet
          onClose={() => setPicker(false)}
          onSelect={handlePeptideSelect}
        />
      </Modal>
      <Modal visible={templatePicker} animationType="slide" transparent onRequestClose={() => setTemplatePicker(false)}>
        <View style={s.sheetOverlay}>
          <Pressable style={s.sheetBackdrop} onPress={() => setTemplatePicker(false)} />
          <SafeAreaView style={s.sheet} edges={['bottom']}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Record Templates</Text>
              <Pressable onPress={() => setTemplatePicker(false)}><Text style={s.sheetDone}>Done</Text></Pressable>
            </View>
            {templates.length === 0 ? (
              <Text style={s.templateEmpty}>No templates saved. Create one from Tools.</Text>
            ) : (
              <FlatList
                data={templates}
                keyExtractor={item => item.id}
                contentContainerStyle={s.sheetListContent}
                renderItem={({ item }) => (
                  <Pressable style={s.sheetRow} onPress={() => applyTemplate(item)}>
                    <Text style={s.sheetRowName}>{item.title}</Text>
                    {!!item.compoundLabel && <Text style={s.templateMeta}>{item.compoundLabel}</Text>}
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </View>
      </Modal>
      <Modal visible={upgradeOpen} animationType="slide" onRequestClose={() => setUpgradeOpen(false)}>
        <UpgradeScreen onClose={() => setUpgradeOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function PeptidePickerSheet({
  onClose, onSelect,
}: { onClose: () => void; onSelect: (p: Peptide) => void }) {
  const [q, setQ] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const filt = (list: Peptide[]) =>
    q ? list.filter(x => x.name.toLowerCase().includes(q.toLowerCase())) : list;

  const submitCustomName = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    Keyboard.dismiss();
    onSelect({ id: 'custom', name: trimmed, defaultUnit: 'mcg' });
  };

  if (customMode) {
    return (
      <KeyboardAvoidingView
        style={s.sheetOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={s.sheetBackdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} />
        <SafeAreaView style={s.sheet} edges={['bottom']}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>Custom Peptide</Text>
            <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
              <Text style={s.sheetDone}>Done</Text>
            </Pressable>
          </View>
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.md }}>
            <TextInput
              placeholder="Enter peptide name…"
              placeholderTextColor={colors.textFaint}
              value={customName}
              onChangeText={setCustomName}
              style={s.sheetSearch}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={submitCustomName}
            />
            <Pressable
              style={[s.templateBtn, !customName.trim() && { opacity: 0.4 }]}
              onPress={submitCustomName}
              disabled={!customName.trim()}
            >
              <Text style={s.templateBtnText}>Use This Name</Text>
            </Pressable>
            <Pressable onPress={() => { setCustomMode(false); setCustomName(''); }}>
              <Text style={[s.templateBtnText, { color: colors.textMuted, marginTop: 4 }]}>
                Choose from list instead
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.sheetOverlay}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable style={s.sheetBackdrop} onPress={() => { Keyboard.dismiss(); onClose(); }} />
      <SafeAreaView style={s.sheet} edges={['bottom']}>
        <View style={s.sheetHeader}>
          <Text style={s.sheetTitle}>Select Peptide</Text>
          <Pressable onPress={() => { Keyboard.dismiss(); onClose(); }}>
            <Text style={s.sheetDone}>Done</Text>
          </Pressable>
        </View>
        <TextInput
          placeholder="Search peptides…"
          placeholderTextColor={colors.textFaint}
          value={q}
          onChangeText={setQ}
          style={s.sheetSearch}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        <FlatList
          data={[
            ...filt(PEPTIDES.singles),
            { __section: 'BLENDS' } as any,
            ...filt(PEPTIDES.blends),
            { __section: 'CUSTOM' } as any,
            { id: 'custom', name: 'Custom Peptide', defaultUnit: 'mcg' } as Peptide,
          ]}
          keyExtractor={(item, i) => item.__section || item.id || `i${i}`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={s.sheetListContent}
          renderItem={({ item }) => {
            if (item.__section) {
              return <Text style={s.sheetSection}>{item.__section}</Text>;
            }
            return (
              <Pressable
                style={s.sheetRow}
                onPress={() => {
                  if (item.id === 'custom') {
                    setCustomMode(true);
                    return;
                  }
                  Keyboard.dismiss();
                  onSelect(item);
                }}
              >
                <Text style={s.sheetRowName}>{item.name}</Text>
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 12 },
  trialCard: { borderColor: colors.teal, backgroundColor: 'rgba(20,184,166,0.08)' },
  trialTitle: { color: colors.white, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  trialBody: { color: colors.text, fontSize: 12, lineHeight: 18 },
  cancelRow: { paddingHorizontal: spacing.xl, marginBottom: spacing.md },
  cancelBtn: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingRight: 12 },
  cancelBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  peptideBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingHorizontal: 18, paddingVertical: 16,
  },
  peptideName: { color: colors.white, fontSize: 16, fontWeight: '500' },
  peptidePlaceholder: { color: colors.textFaint, fontSize: 16 },
  chev: { color: colors.primary, fontSize: 22 },
  templateBtn: { minHeight: 44, marginTop: 8, alignItems: 'center', justifyContent: 'center' },
  templateBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  templateEmpty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', padding: 30 },
  templateMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },

  doseRow: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  doseInput: {
    flex: 1, backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 22, fontWeight: '600',
  },
  unitToggle: {
    flexDirection: 'row', backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, padding: 3,
  },
  unitBtn: { paddingHorizontal: 14, justifyContent: 'center', borderRadius: 9 },
  unitBtnActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)' },
  unitBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  unitBtnTextActive: { color: colors.white },

  timeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeChip: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  timeChipActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)', borderColor: colors.primary },
  timeChipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  timeChipTextActive: { color: colors.white },
  customTimeRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 12 },
  customTimeInput: {
    width: 62, backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 12,
    color: colors.text, fontSize: 18, fontWeight: '600', textAlign: 'center',
  },
  customTimeColon: { color: colors.textMuted, fontSize: 20, fontWeight: '700', alignSelf: 'center' },
  timeHint: { color: colors.textFaint, fontSize: 11, marginTop: 10 },

  anteriorLabel: { textAlign: 'center', color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 3, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, justifyContent: 'center' },
  chip: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.4)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { color: colors.accent, fontSize: 12, fontWeight: '500' },

  sevRow: { flexDirection: 'row', gap: 8 },
  sevBtn: {
    flex: 1, backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  sevBtnText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },

  symptomWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  symptomChip: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  symptomChipActive: {
    backgroundColor: 'rgba(255, 140, 0, 0.15)',
    borderColor: 'rgba(255, 140, 0, 0.4)',
  },
  symptomChipText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  symptomChipTextActive: { color: colors.accent },

  photoArea: {
    alignItems: 'center', justifyContent: 'center', minHeight: 120,
    paddingVertical: 32, paddingHorizontal: 20,
    borderWidth: 2, borderColor: 'rgba(30, 136, 229, 0.3)', borderStyle: 'dashed',
    borderRadius: radius.md, backgroundColor: colors.bgInput,
  },
  photoText: { color: colors.textFaint, fontSize: 13, marginTop: 8 },
  photoImg: { width: '100%', height: 200, borderRadius: 8, resizeMode: 'cover' },
  photoRemove: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(229, 57, 53, 0.15)', borderRadius: 8 },
  photoRemoveText: { color: colors.red, fontSize: 13, fontWeight: '600' },

  textInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 16,
  },
  notes: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 14, minHeight: 70, textAlignVertical: 'top',
  },
  submit: {
    backgroundColor: colors.action, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center',
  },
  submitText: { color: colors.actionText, fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: colors.bgSheet,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '82%',
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  sheetTitle: { color: colors.white, fontSize: 18, fontWeight: '700' },
  sheetDone: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  sheetSearch: {
    margin: 16, backgroundColor: 'rgba(20, 30, 50, 0.5)',
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    color: colors.text, fontSize: 15,
  },
  sheetListContent: { paddingBottom: 28 },
  sheetRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint,
  },
  sheetRowName: { color: colors.white, fontSize: 16, fontWeight: '500' },
  sheetSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8, fontSize: 11, color: colors.textFaint, fontWeight: '700', letterSpacing: 2 },
});
