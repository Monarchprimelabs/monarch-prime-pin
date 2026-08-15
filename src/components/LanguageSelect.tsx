import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, useI18n } from '../lib/i18n';
import { colors, radius, spacing, withAlpha } from '../theme';

// Native names, never translated — a speaker looking for their own language
// scans for the word they use for it, not its name in the current UI locale.
export const LANGUAGE_OPTIONS: { id: Language; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'es', label: 'Español' },
  { id: 'pt', label: 'Português' },
];

export const languageLabel = (id: Language) =>
  LANGUAGE_OPTIONS.find(option => option.id === id)?.label ?? 'English';

/**
 * Single row showing the current language; tapping opens a sheet of choices.
 * Replaces a row of buttons so the card stays readable as languages are added.
 * `compact` is the pill used on the onboarding welcome screen.
 */
export function LanguageSelect({ compact }: { compact?: boolean }) {
  const { t, language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          compact ? s.pill : s.row,
          pressed && s.pressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t('settings.languageLabel')}
        accessibilityValue={{ text: languageLabel(language) }}
      >
        {compact && <Ionicons name="globe-outline" size={14} color={colors.textMuted} />}
        <Text style={compact ? s.pillText : s.rowValue}>{languageLabel(language)}</Text>
        <Ionicons
          name="chevron-down"
          size={compact ? 13 : 17}
          color={compact ? colors.textMuted : colors.primary}
        />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={s.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={s.sheet} onPress={() => undefined}>
            <Text style={s.sheetTitle}>{t('settings.languageLabel')}</Text>
            {LANGUAGE_OPTIONS.map(option => {
              const selected = option.id === language;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => { setLanguage(option.id); setOpen(false); }}
                  style={({ pressed }) => [s.option, pressed && s.optionPressed]}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[s.optionText, selected && s.optionTextActive]}>
                    {option.label}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={19} color={colors.primary} />}
                </Pressable>
              );
            })}
            <Pressable style={s.cancel} onPress={() => setOpen(false)}>
              <Text style={s.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  row: {
    minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: withAlpha(colors.primary, 0.2),
    borderRadius: radius.md, paddingHorizontal: 14,
  },
  rowValue: { color: colors.white, fontSize: 15, fontWeight: '600' },
  pill: {
    minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, borderRadius: 17,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPill,
  },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  pressed: { opacity: 0.65 },

  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgSheet,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 34,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  sheetTitle: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.8, marginBottom: 6,
  },
  option: {
    minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: colors.borderFaint,
  },
  optionPressed: { opacity: 0.6 },
  optionText: { color: colors.text, fontSize: 16 },
  optionTextActive: { color: colors.primary, fontWeight: '700' },
  cancel: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
});
