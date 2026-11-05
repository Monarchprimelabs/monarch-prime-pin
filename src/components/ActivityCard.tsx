import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card, CardLabel } from './UI';
import { colors } from '../theme';
import { useI18n } from '../lib/i18n';
import { EMPTY_METRICS, getLocalMetrics, LocalMetrics, total } from '../lib/localMetrics';

/** "Your activity": the on-device counters, shown to the user they describe. */
export function ActivityCard() {
  const { t } = useI18n();
  const [metrics, setMetrics] = useState<LocalMetrics>(EMPTY_METRICS);
  useEffect(() => { getLocalMetrics().then(setMetrics).catch(() => undefined); }, []);
  const actions = metrics.notificationActions;
  return (
    <Card>
      <CardLabel icon="📈">{t('activity.label')}</CardLabel>
      <Text style={s.line}>{t('activity.daysOpened', { n: metrics.daysOpened })}</Text>
      <Text style={s.line}>{t('activity.entriesLogged', { n: metrics.entriesLogged })}</Text>
      <Text style={s.line}>
        {t('activity.notificationActions', { open: actions.open ?? 0, log: actions.logIt ?? 0, snooze: actions.snooze ?? 0 })}
      </Text>
      <Text style={s.line}>{t('activity.paywall', { shown: total(metrics.paywallShown), bought: total(metrics.paywallPurchased) })}</Text>
      <Text style={s.note}>{t('activity.note')}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  line: { color: colors.text, fontSize: 13, lineHeight: 22 },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 10 },
});
