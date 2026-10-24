import React, { useState } from 'react';
import { Text } from 'react-native';
import { ReadableScrollView as ScrollView } from '../components/Columns';
import { Card, CardLabel } from '../components/UI';
import { useI18n } from '../lib/i18n';
import { Field, formatNumber, Notice, parsePositiveNumber, ToolShell, toolStyles } from './ToolsScreen';

// The no-worksheet build's Tools > Unit conversion: mg and mcg only, for a
// number the user types. No concentration math, no syringe scale.
export function UnitConverterTool({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const [mg, setMg] = useState('');
  const [mcg, setMcg] = useState('');

  const fromMg = (value: string) => {
    setMg(value);
    const n = parsePositiveNumber(value);
    setMcg(n ? formatNumber(n * 1000).replace(/,/g, '') : '');
  };
  const fromMcg = (value: string) => {
    setMcg(value);
    const n = parsePositiveNumber(value);
    setMg(n ? formatNumber(n / 1000).replace(/,/g, '') : '');
  };

  return (
    <ToolShell title={t('tools.units.title')} onClose={onClose}>
      <ScrollView contentContainerStyle={toolStyles.scrollContent} keyboardShouldPersistTaps="handled">
        <Notice text={t('tools.units.note')} />
        <Card>
          <CardLabel icon="⇄">{t('tools.units.massLabel')}</CardLabel>
          <Text style={toolStyles.fieldLabel}>mg</Text>
          <Field value={mg} setValue={fromMg} placeholder="mg" keyboardType="decimal-pad" />
          <Text style={toolStyles.fieldLabel}>mcg</Text>
          <Field value={mcg} setValue={fromMcg} placeholder="mcg" keyboardType="decimal-pad" />
        </Card>
      </ScrollView>
    </ToolShell>
  );
}
