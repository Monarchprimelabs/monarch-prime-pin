import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, TextInput, Modal, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../lib/auth';
import { clearLocalData } from '../lib/storage';
import { FunnelStats, getFunnelStats, resetFunnelStats } from '../lib/funnel';
import { exportBackup, pickBackupFile, restoreBackup } from '../lib/backup';
import { hapticSuccess } from '../lib/haptics';
import { KEY_APP_LOCK } from '../components/AppLockGate';
import { Language, useI18n } from '../lib/i18n';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { cancelAllLocalReminders } from '../lib/notifications';
import { UpgradeScreen } from './UpgradeScreen';

export function SettingsScreen({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'rem' | 'acc' | 'leg'>('rem');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { t } = useI18n();

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title={t('settings.title')} subtitle="" />
      {!!onClose && (
        <View style={s.closeRow}>
          <Pressable style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings">
            <Text style={s.closeText}>{t('settings.backToTools')}</Text>
          </Pressable>
        </View>
      )}

      <View style={s.subTabs}>
        {[
          { id: 'rem' as const, label: t('settings.tabReminders') },
          { id: 'acc' as const, label: t('settings.tabAccess') },
          { id: 'leg' as const, label: t('settings.tabLegal') },
        ].map(item => (
          <Pressable
            key={item.id}
            onPress={() => setTab(item.id)}
            style={[s.subTab, tab === item.id && s.subTabActive]}
          >
            <Text style={[s.subTabText, tab === item.id && s.subTabTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {tab === 'rem' && <RemindersTab />}
        {tab === 'acc' && <AccessTab onOpen={() => setUpgradeOpen(true)} />}
        {tab === 'leg' && <LegalTab />}
      </ScrollView>
      <Modal visible={upgradeOpen} animationType="slide" onRequestClose={() => setUpgradeOpen(false)}>
        <UpgradeScreen onClose={() => setUpgradeOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function RemindersTab() {
  const { user, signOut, updateProfileName } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const [profileName, setProfileName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);
  const [backupBusy, setBackupBusy] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  useEffect(() => {
    if (user?.isDeveloper) getFunnelStats().then(setFunnel).catch(() => undefined);
  }, [user?.isDeveloper]);

  useEffect(() => {
    AsyncStorage.getItem(KEY_APP_LOCK)
      .then(value => setAppLockEnabled(value === 'true'))
      .catch(() => undefined);
  }, []);

  const toggleAppLock = async (next: boolean) => {
    if (next) {
      try {
        const level = await LocalAuthentication.getEnrolledLevelAsync();
        if (level === LocalAuthentication.SecurityLevel.NONE) {
          Alert.alert(
            t('settings.appLockNeedPasscodeTitle'),
            t('settings.appLockNeedPasscodeBody'),
          );
          return;
        }
      } catch {
        // If the check itself fails, fall through and allow the toggle;
        // authenticateAsync will surface any real problem at unlock time.
      }
    }
    setAppLockEnabled(next);
    AsyncStorage.setItem(KEY_APP_LOCK, next ? 'true' : 'false').catch(() => undefined);
    if (next) hapticSuccess();
  };

  const runBackupExport = async () => {
    setBackupBusy(true);
    try {
      await exportBackup();
    } catch (error: any) {
      Alert.alert(t('settings.backupFailedTitle'), error?.message || t('common.tryAgain'));
    } finally {
      setBackupBusy(false);
    }
  };

  const runBackupImport = async () => {
    setBackupBusy(true);
    try {
      const picked = await pickBackupFile();
      if (!picked) return;
      const { payload, counts } = picked;
      const fromDate = payload.exportedAt ? payload.exportedAt.slice(0, 10) : t('settings.unknownDate');
      Alert.alert(
        t('settings.restoreConfirmTitle'),
        t('settings.restoreConfirmBody', {
          date: fromDate,
          inj: counts.injections,
          sch: counts.schedules,
          inv: counts.inventory,
          tpl: counts.templates,
        }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.restoreReplace'),
            style: 'destructive',
            onPress: async () => {
              try {
                await restoreBackup(payload);
                hapticSuccess();
                Alert.alert(t('settings.restoreDoneTitle'), t('settings.restoreDoneBody'));
              } catch (error: any) {
                Alert.alert(t('settings.restoreFailedTitle'), error?.message || t('common.tryAgain'));
              }
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert(t('settings.importFailedTitle'), error?.message || t('common.tryAgain'));
    } finally {
      setBackupBusy(false);
    }
  };

  const saveProfileName = async () => {
    const trimmed = profileName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      Alert.alert(t('settings.missingNameTitle'), t('settings.missingNameBody'));
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName(trimmed);
      setProfileName(trimmed);
      Alert.alert(t('settings.nameSavedTitle'), t('settings.nameSavedBody'));
    } catch (e: any) {
      Alert.alert(t('settings.saveFailedTitle'), e?.message || t('common.tryAgain'));
    } finally {
      setSavingName(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert(t('settings.signOutConfirmTitle'), t('settings.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('settings.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteConfirmTitle'),
      t('settings.deleteConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await cancelAllLocalReminders();
            await clearLocalData();
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <>
      <Card>
        <CardLabel icon="🌐">{t('settings.languageLabel')}</CardLabel>
        <Text style={s.profileHelp}>
          {t('settings.languageHelp')}
        </Text>
        <View style={s.langRow}>
          {([
            { id: 'en' as Language, label: 'English' },
            { id: 'es' as Language, label: 'Español' },
          ]).map(option => (
            <Pressable
              key={option.id}
              onPress={() => setLanguage(option.id)}
              style={[s.langBtn, language === option.id && s.langBtnActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: language === option.id }}
            >
              <Text style={[s.langBtnText, language === option.id && s.langBtnTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Card>
        <CardLabel icon="👤">{t('settings.profileLabel')}</CardLabel>
        <Text style={s.profileHelp}>
          {t('settings.profileHelp')}
        </Text>
        <TextInput
          placeholder={t('settings.namePlaceholder')}
          placeholderTextColor={colors.textFaint}
          value={profileName}
          onChangeText={setProfileName}
          style={s.profileInput}
          autoCapitalize="words"
          textContentType="name"
          autoComplete="name"
        />
        <Pressable
          style={[s.saveNameBtn, savingName && { opacity: 0.5 }]}
          onPress={saveProfileName}
          disabled={savingName}
        >
          <Text style={s.saveNameText}>{savingName ? t('settings.savingName') : t('settings.saveName')}</Text>
        </Pressable>
      </Card>

      <Card>
        <CardLabel icon="🔔">{t('settings.notificationsLabel')}</CardLabel>
        <Text style={s.localDataText}>
          {t('settings.notificationsBody')}
        </Text>
      </Card>

      {!!user?.isDeveloper && !!funnel && (
        <Card>
          <CardLabel icon="📊">FUNNEL (DEV ONLY)</CardLabel>
          <Text style={s.localDataText}>
            Paywall views: {funnel.paywallViews}{'\n'}
            Upgrade taps: {funnel.upgradeTaps}{'\n'}
            Purchases: {funnel.purchases}{'\n'}
            First seen: {funnel.firstSeenAt ? funnel.firstSeenAt.slice(0, 10) : '—'}
          </Text>
          <Pressable
            style={s.saveNameBtn}
            onPress={async () => {
              await resetFunnelStats();
              setFunnel(await getFunnelStats());
            }}
          >
            <Text style={s.saveNameText}>Reset Counters</Text>
          </Pressable>
        </Card>
      )}

      <Card>
        <CardLabel icon="💾">{t('settings.localDataLabel')}</CardLabel>
        <Text style={s.localDataText}>
          {t('settings.localDataBody')}
        </Text>
      </Card>

      <Card>
        <CardLabel icon="🔒">{t('settings.appLockLabel')}</CardLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={s.localDataText}>
              {t('settings.appLockBody')}
            </Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={toggleAppLock}
            trackColor={{ false: 'rgba(120,130,150,0.4)', true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>
      </Card>

      <Card>
        <CardLabel icon="🗄">{t('settings.backupLabel')}</CardLabel>
        <Text style={s.localDataText}>
          {t('settings.backupBody')}
        </Text>
        <Pressable
          style={[s.saveNameBtn, backupBusy && { opacity: 0.5 }]}
          disabled={backupBusy}
          onPress={runBackupExport}
        >
          <Text style={s.saveNameText}>{t('settings.backupExport')}</Text>
        </Pressable>
        <Pressable
          style={[s.saveNameBtn, { marginTop: spacing.md }, backupBusy && { opacity: 0.5 }]}
          disabled={backupBusy}
          onPress={runBackupImport}
        >
          <Text style={s.saveNameText}>{t('settings.backupImport')}</Text>
        </Pressable>
      </Card>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <Pressable style={s.signOutBtn} onPress={confirmSignOut}>
          <Text style={s.signOutText}>{t('settings.signOut')}</Text>
        </Pressable>

        <Pressable style={s.deleteBtn} onPress={confirmDeleteAccount}>
          <Text style={s.deleteBtnText}>{t('settings.deleteAccount')}</Text>
        </Pressable>
      </View>
    </>
  );
}

function AccessTab({ onOpen }: { onOpen: () => void }) {
  const { source, monetizationEnabled } = useEntitlements();
  const { t } = useI18n();
  const label = source === 'paid-app' || source === 'legacy-install'
    ? t('access.founding')
    : source === 'lifetime'
      ? t('access.lifetime')
      : source === 'early-access'
        ? t('access.earlyAccess')
        : t('access.freePlan');
  return (
    <Card>
      <CardLabel icon="◆">{t('access.label')}</CardLabel>
      <Text style={s.accessTitle}>{label}</Text>
      <Text style={s.localDataText}>
        {t('access.body', { n: FREE_INJECTION_LIMIT, price: LIFETIME_PRO_PRICE_LABEL })}
      </Text>
      {!monetizationEnabled && (
        <Text style={s.accessPreview}>{t('access.earlyNote')}</Text>
      )}
      <Pressable style={s.saveNameBtn} onPress={onOpen}>
        <Text style={s.saveNameText}>{t('access.viewDetails')}</Text>
      </Pressable>
    </Card>
  );
}

function LegalTab() {
  const { t } = useI18n();
  return (
    <Card>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, color: colors.accent, fontWeight: '700' }}>
          {t('legal.banner')}
        </Text>
      </View>

      <Text style={s.legalLabel}>{t('legal.disclaimerLabel')}</Text>

      <Text style={s.legalP}>{t('legal.p1')}</Text>

      <Text style={s.legalP}>{t('legal.p2')}</Text>

      <Text style={s.legalP}>{t('legal.p3')}</Text>

      <Text style={s.legalP}>{t('legal.p4')}</Text>

      <Text style={s.legalP}>{t('legal.ack')}</Text>

      <View style={{ paddingLeft: 18 }}>
        <Text style={s.legalLi}>{t('legal.li1')}</Text>
        <Text style={s.legalLi}>{t('legal.li2')}</Text>
        <Text style={s.legalLi}>{t('legal.li3')}</Text>
        <Text style={s.legalLi}>{t('legal.li4')}</Text>
      </View>

      <Text style={s.legalP}>{t('legal.p5')}</Text>

      <Text style={s.legalP}>{t('legal.p6')}</Text>

      <Text style={s.legalFooter}>{t('legal.footer')}</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  closeRow: { paddingHorizontal: spacing.xl, marginTop: -8, marginBottom: 10 },
  closeBtn: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: 12 },
  closeText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  subTabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 3,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  subTabActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)' },
  subTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  subTabTextActive: { color: colors.white },

  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  langBtnActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)', borderColor: colors.primary },
  langBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  langBtnTextActive: { color: colors.white },

  profileHelp: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  profileInput: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  saveNameBtn: {
    backgroundColor: colors.action,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  saveNameText: {
    color: colors.actionText,
    fontSize: 14,
    fontWeight: '700',
  },

  localDataText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 22,
  },
  accessTitle: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  accessPreview: { color: colors.teal, fontSize: 12, fontWeight: '700', marginTop: 12, marginBottom: 12 },

  signOutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(229, 57, 53, 0.3)',
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 10,
  },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '600' },

  deleteBtn: {
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  deleteBtnText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: '700',
  },

  legalLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  legalP: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 12,
  },
  legalLi: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 4,
  },
  legalFooter: {
    textAlign: 'center',
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
