import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Card, CardLabel } from './UI';
import { PremiumBadge } from './PremiumLock';
import { colors, radius, spacing, withAlpha } from '../theme';
import { useI18n } from '../lib/i18n';
import { usePremium } from '../lib/usePremium';
import { formatClockTime } from '../data/peptides';
import { DEFAULT_PREFS, NotifyPrefs, PhotoCheckin } from '../lib/notify/prefs';
import { getNotifyPrefs, setNotifyPrefs } from '../lib/notify/store';
import { syncProtocolReminders } from '../lib/protocolReminders';

// Settings > Notifications: one switch per notification type, the photo
// check-in frequency and quiet hours. Every type is listed, Premium ones
// included with a badge (Guideline 2.5.19). Nothing here asks for
// permission; that only happens when the user sets a plan reminder.

const PHOTO: { id: PhotoCheckin; key: string }[] = [
  { id: 'off', key: 'notify.photoOff' },
  { id: 'weekly', key: 'notify.photoWeekly' },
  { id: 'biweekly', key: 'notify.photoBiweekly' },
  { id: 'monthly', key: 'notify.photoMonthly' },
];

const QUIET: { start: string; end: string }[] = [
  { start: '00:00', end: '00:00' }, // off: start === end
  { start: '21:00', end: '07:00' },
  { start: '22:00', end: '08:00' },
  { start: '23:00', end: '09:00' },
];

type Toggle = 'planFollowUp' | 'vialLow' | 'restock' | 'weeklySummary' | 'monthlyReport' | 'trialEnding';

export function NotificationSettings() {
  const { t } = useI18n();
  const { premium: hasPremium } = usePremium();
  const [prefs, setPrefs] = useState<NotifyPrefs>(DEFAULT_PREFS);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    getNotifyPrefs().then(setPrefs).catch(() => undefined);
    if (Platform.OS !== 'web') {
      Notifications.getPermissionsAsync()
        .then(p => setDenied(!p.granted && !p.canAskAgain))
        .catch(() => undefined);
    }
  }, []);

  const update = (patch: Partial<NotifyPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setNotifyPrefs(next)
      .then(() => syncProtocolReminders())
      .catch(() => undefined);
  };

  const toggles: { id: Toggle; key: string; premium?: boolean }[] = [
    { id: 'planFollowUp', key: 'notify.optFollowUp' },
    { id: 'vialLow', key: 'notify.optVialLow' },
    { id: 'restock', key: 'notify.optRestock' },
    { id: 'weeklySummary', key: 'notify.optWeekly' },
    { id: 'monthlyReport', key: 'notify.optMonthly', premium: true },
    { id: 'trialEnding', key: 'notify.optTrial' },
  ];

  return (
    <Card>
      <CardLabel icon="🔔">{t('settings.notificationsLabel')}</CardLabel>
      <Text style={s.help}>{t('notify.settingsHelp')}</Text>
      {denied && <Text style={s.warn}>{t('notify.permissionOff')}</Text>}

      {toggles.map(item => (
        <View key={item.id} style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.rowText}>{t(item.key)}</Text>
            {item.premium && !hasPremium && <PremiumBadge />}
          </View>
          <Switch
            value={prefs[item.id]}
            onValueChange={value => update({ [item.id]: value } as Partial<NotifyPrefs>)}
            trackColor={{ false: 'rgba(120,130,150,0.4)', true: colors.primary }}
            thumbColor={colors.white}
            accessibilityLabel={t(item.key)}
          />
        </View>
      ))}

      <Text style={s.groupLabel}>{t('notify.photoLabel')}</Text>
      <View style={s.chips}>
        {PHOTO.map(option => {
          const active = prefs.photoCheckin === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => update({ photoCheckin: option.id })}
              style={[s.chip, active && s.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{t(option.key)}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.groupLabel}>{t('notify.quietLabel')}</Text>
      <View style={s.chips}>
        {QUIET.map(option => {
          const active = prefs.quietStart === option.start && prefs.quietEnd === option.end;
          const label = option.start === option.end
            ? t('notify.quietOff')
            : t('notify.quietRange', { start: formatClockTime(option.start), end: formatClockTime(option.end) });
          return (
            <Pressable
              key={`${option.start}-${option.end}`}
              onPress={() => update({ quietStart: option.start, quietEnd: option.end })}
              style={[s.chip, active && s.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  warn: { color: colors.accent, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  rowText: { color: colors.text, fontSize: 14 },
  groupLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: spacing.md, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.md,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: withAlpha(colors.primary, 0.2),
  },
  chipActive: { backgroundColor: withAlpha(colors.primary, 0.25), borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: colors.white },
});
