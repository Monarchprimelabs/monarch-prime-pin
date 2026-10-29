import React, { useState } from 'react';
import { Alert, Image, Modal, Platform, Pressable, ScrollView as PlainScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { ReadableScrollView as ScrollView } from '../components/Columns';
import { Card, Disclaimer } from '../components/UI';
import { kit, ShellHeader } from '../components/FormKit';
import { colors, spacing } from '../theme';
import { useI18n } from '../lib/i18n';
import { localDateISO, parseLocalDay } from '../lib/dates';
import { deleteLabReport, newLabReportId, saveLabReport } from '../lib/storage';
import { keepReportFile, reportFileUri } from '../lib/labs/reportFiles';
import { reportFileKind } from '../lib/labs/reports';
import type { LabReport, LabReportFile } from '../lib/labs/types';

// Saved lab reports (Premium): the user's own report kept as photos or a PDF,
// on this phone only. The app stores and shows it; it never reads values out
// of it. The user types the markers they want to chart as lab results.

type Page = LabReportFile & { pickedUri?: string };

const pageUri = (page: Page) => page.pickedUri ?? reportFileUri(page.ref);

export function pagesLabel(report: LabReport, t: (k: string, p?: Record<string, string | number>) => string) {
  return report.files.length === 1 ? t('labs.reportOnePage') : t('labs.reportPagesCount', { n: report.files.length });
}

export function ReportForm({ initial, onCancel, onSaved }: {
  initial: LabReport | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const [date, setDate] = useState(initial?.date ?? localDateISO());
  const [picking, setPicking] = useState(false);
  const [label, setLabel] = useState(initial?.label ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [pages, setPages] = useState<Page[]>(initial?.files ?? []);
  const [saving, setSaving] = useState(false);

  const addPicked = (picked: Page[]) => setPages(current => [...current, ...picked]);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('log.permTitle'), t('labs.reportPermCamera'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      addPicked([{ ref: '', pickedUri: a.uri, kind: 'image', width: a.width, height: a.height }]);
    }
  };

  const choosePhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsMultipleSelection: true,
      orderedSelection: true,
    });
    if (!result.canceled) {
      addPicked(result.assets.map(a => ({ ref: '', pickedUri: a.uri, kind: 'image' as const, width: a.width, height: a.height })));
    }
  };

  const chooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: true,
    });
    if (result.canceled) return;
    const picked: Page[] = [];
    for (const asset of result.assets ?? []) {
      const kind = reportFileKind(asset);
      if (kind) picked.push({ ref: '', pickedUri: asset.uri, kind });
    }
    if (picked.length < (result.assets ?? []).length) Alert.alert(t('labs.reportUnsupported'));
    addPicked(picked);
  };

  const removePage = (index: number) => setPages(current => current.filter((_, i) => i !== index));

  const save = async () => {
    if (pages.length === 0) {
      Alert.alert(t('labs.reportNoPagesTitle'), t('labs.reportNoPages'));
      return;
    }
    setSaving(true);
    try {
      const files: LabReportFile[] = [];
      for (const page of pages) {
        const ref = page.pickedUri ? await keepReportFile(page.pickedUri, page.kind) : page.ref;
        files.push({ ref, kind: page.kind, ...(page.width && page.height ? { width: page.width, height: page.height } : {}) });
      }
      await saveLabReport({
        id: initial?.id ?? newLabReportId(),
        date,
        label: label.trim(),
        files,
        notes: notes.trim() || undefined,
        createdAt: initial?.createdAt ?? new Date().toISOString(),
      });
      onSaved();
    } catch (error: any) {
      Alert.alert(t('labs.reportSaveFailed'), error?.message || t('common.tryAgain'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={kit.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <ShellHeader title={initial ? t('labs.reportEditTitle') : t('labs.reportAdd')} backLabel={t('common.cancel')} onBack={onCancel} />
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
          <Text style={s.label}>{t('labs.reportLabel')}</Text>
          <TextInput style={kit.input} value={label} onChangeText={setLabel} placeholder={t('labs.reportLabelPh')} placeholderTextColor={colors.textFaint} />
        </Card>

        <Card>
          <Text style={s.label}>{t('labs.reportPages')}</Text>
          {pages.length === 0 && <Text style={kit.listMeta}>{t('labs.reportsNote')}</Text>}
          {pages.map((page, index) => (
            <View key={`${page.ref}-${page.pickedUri}-${index}`} style={s.pageRow}>
              {page.kind === 'image' ? (
                <Image source={{ uri: pageUri(page) }} style={s.thumb} resizeMode="cover" />
              ) : (
                <View style={[s.thumb, s.pdfThumb]}><Text style={s.pdfThumbText}>PDF</Text></View>
              )}
              <Text style={[kit.listTitle, { flex: 1 }]}>{t('labs.reportPageN', { n: index + 1 })}</Text>
              <Pressable style={kit.smallBtn} onPress={() => removePage(index)} accessibilityRole="button">
                <Text style={[kit.smallBtnText, { color: colors.red }]}>{t('labs.reportRemovePage')}</Text>
              </Pressable>
            </View>
          ))}
          <View style={s.addRow}>
            <Pressable style={[kit.smallBtn, s.addBtn]} onPress={takePhoto} accessibilityRole="button">
              <Text style={kit.smallBtnText}>{t('labs.reportTakePhoto')}</Text>
            </Pressable>
            <Pressable style={[kit.smallBtn, s.addBtn]} onPress={choosePhotos} accessibilityRole="button">
              <Text style={kit.smallBtnText}>{t('labs.reportChoosePhotos')}</Text>
            </Pressable>
            <Pressable style={[kit.smallBtn, s.addBtn]} onPress={chooseFile} accessibilityRole="button">
              <Text style={kit.smallBtnText}>{t('labs.reportChooseFile')}</Text>
            </Pressable>
          </View>
        </Card>

        <Card>
          <Text style={s.label}>{t('log.notes')}</Text>
          <TextInput style={[kit.input, kit.multiline]} value={notes} onChangeText={setNotes} multiline placeholderTextColor={colors.textFaint} />
        </Card>

        <View style={{ paddingHorizontal: spacing.xl }}>
          <Pressable style={[kit.primaryBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving} accessibilityRole="button">
            <Text style={kit.primaryBtnText}>{t('labs.reportSave')}</Text>
          </Pressable>
        </View>
        <Text style={s.footer}>{t('labs.disclaimer')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export function ReportView({ report, readOnly, onBack, onEdit, onDeleted, onAddResult }: {
  report: LabReport;
  readOnly: boolean;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  onAddResult: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState<LabReportFile | null>(null);

  const share = async (page: LabReportFile) => {
    try {
      if (!(await Sharing.isAvailableAsync())) throw new Error();
      await Sharing.shareAsync(reportFileUri(page.ref), page.kind === 'pdf'
        ? { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }
        : { mimeType: 'image/jpeg', UTI: 'public.image' });
    } catch {
      Alert.alert(t('labs.reportOpenFailed'));
    }
  };

  // Android's WebView can't show a PDF, so it opens in another app instead.
  const openPage = (page: LabReportFile) => {
    if (page.kind === 'pdf' && Platform.OS !== 'ios') share(page);
    else setOpen(page);
  };

  const confirmDelete = () => Alert.alert(t('labs.reportDeleteTitle'), t('labs.reportDeleteBody'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: async () => { await deleteLabReport(report.id); onDeleted(); } },
  ]);

  const title = report.label || t('labs.reportUntitled');
  return (
    <SafeAreaView style={kit.app} edges={['top', 'bottom', 'left', 'right']}>
      <Disclaimer />
      <ShellHeader title={title} backLabel={t('labs.back')} onBack={onBack} />
      <ScrollView contentContainerStyle={kit.scrollContent}>
        <Card>
          <Text style={kit.listMeta}>{parseLocalDay(report.date).toLocaleDateString()} · {pagesLabel(report, t)}</Text>
          {!!report.notes && <Text style={[kit.listMeta, { marginTop: 4 }]}>{report.notes}</Text>}
          <View style={kit.itemActions}>
            {!readOnly && (
              <Pressable style={kit.smallBtn} onPress={onEdit} accessibilityRole="button">
                <Text style={kit.smallBtnText}>{t('history.edit')}</Text>
              </Pressable>
            )}
            <Pressable style={kit.smallBtn} onPress={confirmDelete} accessibilityRole="button">
              <Text style={[kit.smallBtnText, { color: colors.red }]}>{t('common.delete')}</Text>
            </Pressable>
          </View>
        </Card>

        {!readOnly && (
          <View style={{ paddingHorizontal: spacing.xl, marginBottom: spacing.lg }}>
            <Pressable style={kit.primaryBtn} onPress={onAddResult} accessibilityRole="button">
              <Text style={kit.primaryBtnText}>{t('labs.reportAddResult')}</Text>
            </Pressable>
          </View>
        )}

        {report.files.map((page, index) => (
          <Card key={page.ref}>
            <Pressable onPress={() => openPage(page)} accessibilityRole="button" accessibilityLabel={t('labs.reportPageN', { n: index + 1 })}>
              {page.kind === 'image' ? (
                <Image
                  source={{ uri: reportFileUri(page.ref) }}
                  style={[s.page, { aspectRatio: page.width && page.height ? page.width / page.height : 0.77 }]}
                  resizeMode="contain"
                />
              ) : (
                <View style={s.pdfCard}>
                  <Text style={s.pdfThumbText}>PDF</Text>
                  <Text style={kit.listTitle}>{t('labs.reportPdf')}</Text>
                </View>
              )}
            </Pressable>
            <View style={kit.itemActions}>
              <Pressable style={kit.smallBtn} onPress={() => openPage(page)} accessibilityRole="button">
                <Text style={kit.smallBtnText}>{t('labs.reportOpen')}</Text>
              </Pressable>
              <Pressable style={kit.smallBtn} onPress={() => share(page)} accessibilityRole="button">
                <Text style={kit.smallBtnText}>{t('labs.reportShare')}</Text>
              </Pressable>
            </View>
          </Card>
        ))}
        <Text style={s.footer}>{t('labs.disclaimer')}</Text>
      </ScrollView>
      <PageViewer page={open} onClose={() => setOpen(null)} />
    </SafeAreaView>
  );
}

/** Full screen: pinch to zoom a photo; a PDF in the system viewer (iOS). */
function PageViewer({ page, onClose }: { page: LabReportFile | null; onClose: () => void }) {
  const { t } = useI18n();
  const uri = page ? reportFileUri(page.ref) : '';
  return (
    <Modal visible={!!page} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={s.viewer} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.viewerBar}>
          <Pressable onPress={onClose} style={kit.smallBtn} accessibilityRole="button">
            <Text style={kit.smallBtnText}>{t('labs.reportClose')}</Text>
          </Pressable>
        </View>
        {page?.kind === 'pdf' ? (
          <WebView
            source={{ uri }}
            originWhitelist={['*']}
            allowFileAccess
            allowingReadAccessToURL={uri.slice(0, uri.lastIndexOf('/') + 1)}
            style={{ flex: 1, backgroundColor: colors.bg }}
          />
        ) : page ? (
          <PlainScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
            maximumZoomScale={5}
            minimumZoomScale={1}
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          >
            <Image source={{ uri }} style={{ width: '100%', aspectRatio: page.width && page.height ? page.width / page.height : 0.77 }} resizeMode="contain" />
          </PlainScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6, textTransform: 'uppercase' },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  thumb: { width: 48, height: 62, borderRadius: 6, backgroundColor: colors.bgInput },
  pdfThumb: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  pdfThumbText: { color: colors.primary, fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  addRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  addBtn: { flexGrow: 1 },
  page: { width: '100%', borderRadius: 8, backgroundColor: colors.bgInput },
  pdfCard: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  viewer: { flex: 1, backgroundColor: colors.bg },
  viewerBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  footer: { color: colors.textMuted, fontSize: 12, lineHeight: 17, textAlign: 'center', paddingHorizontal: spacing.xl, marginTop: spacing.lg },
});
