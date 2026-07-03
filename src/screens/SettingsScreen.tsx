import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Alert, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../lib/auth';
import { clearLocalData } from '../lib/storage';
import { FunnelStats, getFunnelStats, resetFunnelStats } from '../lib/funnel';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { cancelAllLocalReminders } from '../lib/notifications';
import { UpgradeScreen } from './UpgradeScreen';

export function SettingsScreen({ onClose }: { onClose?: () => void }) {
  const [tab, setTab] = useState<'rem' | 'acc' | 'leg'>('rem');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Settings" subtitle="" />
      {!!onClose && (
        <View style={s.closeRow}>
          <Pressable style={s.closeBtn} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close settings">
            <Text style={s.closeText}>‹ Tools</Text>
          </Pressable>
        </View>
      )}

      <View style={s.subTabs}>
        {[
          { id: 'rem' as const, label: 'Reminders' },
          { id: 'acc' as const, label: 'Access' },
          { id: 'leg' as const, label: 'Legal' },
        ].map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[s.subTab, tab === t.id && s.subTabActive]}
          >
            <Text style={[s.subTabText, tab === t.id && s.subTabTextActive]}>
              {t.label}
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
  const [profileName, setProfileName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [funnel, setFunnel] = useState<FunnelStats | null>(null);

  useEffect(() => {
    if (user?.isDeveloper) getFunnelStats().then(setFunnel).catch(() => undefined);
  }, [user?.isDeveloper]);

  const saveProfileName = async () => {
    const trimmed = profileName.trim().replace(/\s+/g, ' ');
    if (!trimmed) {
      Alert.alert('Missing name', 'Please enter the name you want shown on your dashboard.');
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName(trimmed);
      setProfileName(trimmed);
      Alert.alert('Saved', 'Your dashboard greeting has been updated.');
    } catch (e: any) {
      Alert.alert('Save failed', e?.message || 'Please try again.');
    } finally {
      setSavingName(false);
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign back in to access this app.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete account and local data?',
      'This will remove your local account profile and all logs stored on this device. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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
        <CardLabel icon="👤">PROFILE</CardLabel>
        <Text style={s.profileHelp}>
          This name is used for your dashboard greeting.
        </Text>
        <TextInput
          placeholder="Name"
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
          <Text style={s.saveNameText}>{savingName ? 'Saving...' : 'Save Name'}</Text>
        </Pressable>
      </Card>

      <Card>
        <CardLabel icon="🔔">NOTIFICATION SETTINGS</CardLabel>
        <Text style={s.localDataText}>
          Create and manage local notifications from Tools → Schedule & Reminders. Monarch only reminds you about dates and times that you enter yourself.
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
        <CardLabel icon="💾">LOCAL DATA</CardLabel>
        <Text style={s.localDataText}>
          Your research logs and organization-tool entries are stored locally on this device. Deleting your account removes the local profile, schedules, inventory, templates, and locally stored log data from this device.
        </Text>
      </Card>

      <View style={{ paddingHorizontal: spacing.xl }}>
        <Pressable style={s.signOutBtn} onPress={confirmSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>

        <Pressable style={s.deleteBtn} onPress={confirmDeleteAccount}>
          <Text style={s.deleteBtnText}>Delete Account & Local Data</Text>
        </Pressable>
      </View>
    </>
  );
}

function AccessTab({ onOpen }: { onOpen: () => void }) {
  const { source, monetizationEnabled } = useEntitlements();
  const label = source === 'paid-app' || source === 'legacy-install'
    ? 'Founding purchaser · Lifetime Pro'
    : source === 'lifetime'
      ? 'Lifetime Pro'
      : source === 'early-access'
        ? 'Early access · Pro preview'
        : 'Free plan';
  return (
    <Card>
      <CardLabel icon="◆">YOUR ACCESS</CardLabel>
      <Text style={s.accessTitle}>{label}</Text>
      <Text style={s.localDataText}>
        Free installs include app exploration and {FREE_INJECTION_LIMIT} saved injection records. Lifetime Pro unlocks unlimited usage for {LIFETIME_PRO_PRICE_LABEL}. Prior paid-download customers keep full access permanently.
      </Text>
      {!monetizationEnabled && (
        <Text style={s.accessPreview}>All Pro tools are open during early access.</Text>
      )}
      <Pressable style={s.saveNameBtn} onPress={onOpen}>
        <Text style={s.saveNameText}>View Access Details</Text>
      </Pressable>
    </Card>
  );
}

function LegalTab() {
  return (
    <Card>
      <View style={{ alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 18, color: colors.accent, fontWeight: '700' }}>
          ⚠ FOR RESEARCH USE ONLY
        </Text>
      </View>

      <Text style={s.legalLabel}>IMPORTANT DISCLAIMER</Text>

      <Text style={s.legalP}>
        All peptides, compounds, and substances referenced in this application are intended SOLELY for research purposes in controlled laboratory settings.
      </Text>

      <Text style={s.legalP}>
        These substances are NOT approved for human consumption, self-administration, or therapeutic use by any regulatory authority including the FDA, EMA, or equivalent bodies.
      </Text>

      <Text style={s.legalP}>
        MONARCH PRIME PIN TRACKER is a research data logging tool only. It does not constitute medical advice, diagnosis, or treatment recommendations.
      </Text>

      <Text style={s.legalP}>
        This application does not calculate, recommend, or prescribe dosages. The concentration worksheet only divides a user-entered total mass by a user-entered liquid volume and converts that user-entered volume into U-100 marking references. It is not connected to compounds, schedules, or saved records. All record and schedule entries are manually entered by the user.
      </Text>

      <Text style={s.legalP}>By using this application, you acknowledge:</Text>

      <View style={{ paddingLeft: 18 }}>
        <Text style={s.legalLi}>• You are using this for legitimate research recordkeeping purposes only</Text>
        <Text style={s.legalLi}>• You will not use this application to facilitate human consumption of research compounds</Text>
        <Text style={s.legalLi}>• You accept full legal and ethical responsibility for your research activities</Text>
        <Text style={s.legalLi}>• The developers of this application bear no liability for misuse</Text>
      </View>

      <Text style={s.legalP}>
        Misuse of research peptides may be illegal in your jurisdiction and can pose serious health risks.
      </Text>

      <Text style={s.legalP}>
        If you are experiencing a medical emergency, contact emergency services immediately.
      </Text>

      <Text style={s.legalFooter}>Monarch Prime Pin Tracker v1.1 — Research Use Only</Text>
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
