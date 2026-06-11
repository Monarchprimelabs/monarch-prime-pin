import React, { useState } from 'react';
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
import { PEPTIDES, ALL_ZONES, Injection, Peptide, Severity } from '../data/peptides';
import { getRecordTemplates, RecordTemplate, saveInjection, updateInjection, uploadPhoto } from '../lib/storage';
import { getInjectionSiteIds } from '../lib/sites';

type LogInjectionScreenProps = {
  onDone: () => void;
  initialDate?: string;
  initialInjection?: Injection;
  onCancel?: () => void;
};

export function LogInjectionScreen({ onDone, initialDate, initialInjection, onCancel }: LogInjectionScreenProps) {
  const initialPeptide = initialInjection
    ? [...PEPTIDES.singles, ...PEPTIDES.blends].find(p => p.name === initialInjection.peptide)
      ?? { id: 'existing-custom', name: initialInjection.peptide, defaultUnit: initialInjection.unit }
    : null;
  const initialSites = initialInjection ? getInjectionSiteIds(initialInjection) : [];

  const [peptide, setPeptide] = useState<Peptide | null>(initialPeptide);
  const [picker, setPicker] = useState(false);
  const [templatePicker, setTemplatePicker] = useState(false);
  const [templates, setTemplates] = useState<RecordTemplate[]>([]);
  const [dose, setDose] = useState(initialInjection?.dose ?? '');
  const [unit, setUnit] = useState<'mcg' | 'mg'>(initialInjection?.unit ?? 'mcg');
  const [view, setView] = useState<'front' | 'back'>('front');
  const [selected, setSelected] = useState<string[]>(initialSites);
  const [sev, setSev] = useState<Severity>(initialInjection?.sev ?? 'none');
  const [weight, setWeight] = useState(initialInjection?.weight ? String(initialInjection.weight) : '');
  const [notes, setNotes] = useState(initialInjection?.notes ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(initialInjection?.photoUri ?? null);
  const [saving, setSaving] = useState(false);

  const isEditing = !!initialInjection;
  const logDate = initialInjection?.date ?? initialDate ?? new Date().toISOString().slice(0, 10);


  const toggle = (id: string) =>
    setSelected(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));

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

      const now = new Date();
      const record = {
        peptide: peptide.name,
        dose,
        unit,
        date: logDate,
        time: initialInjection?.time ?? now.toTimeString().slice(0, 5),
        site: selected.map(id => { const z = ALL_ZONES.find(x => x.id === id); return z ? z.label : id; }).join(", "),
        sev,
        weight: weight ? Number(weight) : 0,
        notes: notes || undefined,
        photoUri: uploadedPhotoUri,
      };

      if (initialInjection) {
        await updateInjection({ ...record, id: initialInjection.id });
      } else {
        await saveInjection(record);
      }

      Alert.alert(isEditing ? 'Record updated' : 'Saved!', isEditing ? 'Your changes have been saved.' : 'Your injection has been logged.', [
        { text: 'OK', onPress: () => {
          setPeptide(null);
          setDose('');
          setSelected([]);
          setSev('none');
          setWeight('');
          setNotes('');
          setPhotoUri(null);
          onDone();
        }},
      ]);
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

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
            onPress={openTemplates}
            accessibilityRole="button"
            accessibilityLabel="Use a saved record template"
          >
            <Text style={s.templateBtnText}>Use Record Template</Text>
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
    </SafeAreaView>
  );
}

function PeptidePickerSheet({
  onClose, onSelect,
}: { onClose: () => void; onSelect: (p: Peptide) => void }) {
  const [q, setQ] = useState('');
  const filt = (list: Peptide[]) =>
    q ? list.filter(x => x.name.toLowerCase().includes(q.toLowerCase())) : list;

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
                onPress={() => { Keyboard.dismiss(); onSelect(item); }}
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

  photoArea: {
    alignItems: 'center', justifyContent: 'center', minHeight: 120,
    paddingVertical: 32, paddingHorizontal: 20,
    borderWidth: 2, borderColor: 'rgba(30, 136, 229, 0.3)', borderStyle: 'dashed',
    borderRadius: radius.md, backgroundColor: 'rgba(10, 20, 38, 0.3)',
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
    backgroundColor: colors.primary, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center',
  },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '700', letterSpacing: 2 },

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
