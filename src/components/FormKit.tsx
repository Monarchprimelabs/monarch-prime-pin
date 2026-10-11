import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, withAlpha } from '../theme';

// Shared header and form styles for the protocol and vial tools. They match
// the Tools screen's own look (ToolsScreen.tsx), which keeps its local copy.

export function ShellHeader({ title, backLabel, onBack }: { title: string; backLabel: string; onBack: () => void }) {
  return (
    <View style={kit.toolHeader}>
      <Pressable style={kit.backBtn} onPress={onBack} accessibilityRole="button" accessibilityLabel={backLabel}>
        <Text style={kit.backText}>{backLabel}</Text>
      </Pressable>
      <Text style={kit.toolHeaderTitle}>{title}</Text>
      <View style={kit.backBtn} />
    </View>
  );
}

export const kit = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  toolHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, paddingHorizontal: spacing.xl },
  backBtn: { width: 80, minHeight: 44, justifyContent: 'center' },
  backText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  toolHeaderTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: 60 },
  notice: { marginHorizontal: spacing.xl, marginBottom: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.accent, backgroundColor: withAlpha(colors.accent, 0.08), padding: 12 },
  noticeText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  input: { minHeight: 48, backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.text, paddingHorizontal: 13, paddingVertical: 11, marginBottom: 10, fontSize: 14 },
  multiline: { minHeight: 72, textAlignVertical: 'top', marginTop: 10 },
  primaryBtn: { minHeight: 48, borderRadius: radius.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { color: colors.actionText, fontSize: 15, fontWeight: '700' },
  listItem: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderFaint, paddingVertical: 12 },
  listTitle: { color: colors.white, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  listMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  smallBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  empty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 18 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { minHeight: 36, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPill, justifyContent: 'center' },
  chipActive: { borderColor: colors.primary, backgroundColor: withAlpha(colors.primary, 0.15) },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
  unitRow: { flexDirection: 'row', backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 3 },
  unitBtn: { flex: 1, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  unitBtnActive: { backgroundColor: withAlpha(colors.primary, 0.25) },
  unitText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  unitTextActive: { color: colors.white },
  helper: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 8 },
  helperWarn: { color: colors.red, fontSize: 12, marginTop: 4 },
  twoCol: { flexDirection: 'row', gap: 10, marginTop: 8 },
  fieldLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  switchTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  switchSub: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginTop: 2 },
  pickerField: { flex: 1, justifyContent: 'center' },
  pickerFieldText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  pickerWrap: { marginBottom: 10, backgroundColor: colors.bgSheet, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 8 },
  pickerDone: { alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', paddingHorizontal: 14 },
  pickerDoneText: { color: colors.primary, fontSize: 15, fontWeight: '700' },
});
