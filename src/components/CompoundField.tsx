import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import type { Peptide } from '../data/peptides';
import { PeptidePickerSheet } from '../screens/LogInjectionScreen';

// A tap-to-pick compound field: the same searchable list (singles, blends,
// custom name) the log screen uses, so every screen picks compounds the same
// way and names match across records, protocols and vials.
export function CompoundField({ value, placeholder, onChange, accessibilityLabel }: {
  value: string;
  placeholder: string;
  onChange: (compound: Peptide) => void;
  accessibilityLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        style={({ pressed }) => [st.field, pressed && st.pressed]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={value ? `${accessibilityLabel}: ${value}` : accessibilityLabel}
      >
        <Text style={value ? st.value : st.placeholder} numberOfLines={1}>{value || placeholder}</Text>
        <Text style={st.chev}>›</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <SafeAreaProvider>
          <PeptidePickerSheet
            onClose={() => setOpen(false)}
            onSelect={compound => { onChange(compound); setOpen(false); }}
          />
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  field: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14,
  },
  pressed: { borderColor: colors.primary },
  value: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  placeholder: { flex: 1, color: colors.textFaint, fontSize: 15 },
  chev: { color: colors.textMuted, fontSize: 22 },
});
