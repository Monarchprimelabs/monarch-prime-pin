import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../lib/auth';
import { clearLocalData } from '../lib/storage';

export function SettingsScreen() {
  const [tab, setTab] = useState<'rem' | 'leg'>('rem');

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Settings" subtitle="" />

      <View style={s.subTabs}>
        {[
          { id: 'rem' as const, label: 'Reminders' },
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
        {tab === 'rem' ? <RemindersTab /> : <LegalTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function RemindersTab() {
  const [r1, setR1] = useState(false);
  const [r2, setR2] = useState(false);
  const [r3, setR3] = useState(false);
  const { signOut } = useAuth();

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
        <CardLabel icon="🔔">NOTIFICATION SETTINGS</CardLabel>
        <ToggleRow title="Log Reminders" sub="Daily reminder to review your research log" on={r1} setOn={setR1} />
        <ToggleRow title="Weekly Summary" sub="Weekly research log summary" on={r2} setOn={setR2} />
        <ToggleRow title="Progress Photo Reminder" sub="Monthly progress photo prompt" on={r3} setOn={setR3} />
      </Card>

      <Card>
        <CardLabel icon="💾">LOCAL DATA</CardLabel>
        <Text style={s.localDataText}>
          Your research logs are stored locally on this device. Deleting your account removes the local profile and locally stored log data from this device.
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

function ToggleRow({
  title,
  sub,
  on,
  setOn,
}: {
  title: string;
  sub: string;
  on: boolean;
  setOn: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.toggleTitle}>{title}</Text>
        <Text style={s.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={on}
        onValueChange={setOn}
        trackColor={{ false: 'rgba(120, 130, 150, 0.4)', true: colors.primary }}
        thumbColor={colors.white}
      />
    </View>
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
        This application does not calculate, recommend, or prescribe dosages. All entries are manually entered by the user.
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

      <Text style={s.legalFooter}>Monarch Prime Pin Tracker v1.0 — Research Use Only</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },

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

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderFaint,
  },
  toggleTitle: { color: colors.white, fontSize: 15, fontWeight: '600' },
  toggleSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  localDataText: {
    color: '#C8D4E6',
    fontSize: 13,
    lineHeight: 22,
  },

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
    color: '#C8D4E6',
    fontSize: 13,
    lineHeight: 22,
    marginBottom: 12,
  },
  legalLi: {
    color: '#C8D4E6',
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
