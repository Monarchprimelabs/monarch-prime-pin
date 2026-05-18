import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel } from '../components/UI';
import { colors, spacing, radius } from '../theme';
import { useAuth } from '../lib/auth';

export function SettingsScreen() {
  const [tab, setTab] = useState<'calc' | 'sub' | 'rem' | 'leg'>('calc');
  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="Settings" subtitle="" />
      <View style={s.subTabs}>
        {([
          { id: 'calc' as const, label: 'Calculator' },
          { id: 'sub'  as const, label: 'Subscription' },
          { id: 'rem'  as const, label: 'Reminders' },
          { id: 'leg'  as const, label: 'Legal' },
        ]).map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={[s.subTab, tab === t.id && s.subTabActive]}
          >
            <Text style={[s.subTabText, tab === t.id && s.subTabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {tab === 'calc' && <CalculatorTab />}
        {tab === 'sub'  && <SubscriptionTab />}
        {tab === 'rem'  && <RemindersTab />}
        {tab === 'leg'  && <LegalTab />}
      </ScrollView>
    </SafeAreaView>
  );
}

function CalculatorTab() {
  const [vialMg, setVialMg] = useState('10');
  const [bacMl, setBacMl]   = useState('2');
  const [doseVal, setDoseVal] = useState('');
  const [doseUnit, setDoseUnit] = useState<'mcg' | 'mg'>('mcg');

  const conc = Number(vialMg) && Number(bacMl) ? Number(vialMg) / Number(bacMl) : 0;
  const concMcg = conc * 1000;
  const doseInMg = doseVal ? (doseUnit === 'mcg' ? Number(doseVal) / 1000 : Number(doseVal)) : 0;
  const drawMl = conc > 0 ? doseInMg / conc : 0;
  const iu = drawMl * 100;

  return (
    <>
      <Card>
        <CardLabel icon="🧪">VIAL RECONSTITUTION</CardLabel>
        <Text style={s.calcLabel}>VIAL SIZE (MG)</Text>
        <TextInput value={vialMg} onChangeText={setVialMg} keyboardType="numeric" style={s.input} />
        <Text style={s.calcLabel}>BAC WATER (ML)</Text>
        <TextInput value={bacMl} onChangeText={setBacMl} keyboardType="numeric" placeholder="e.g. 2" placeholderTextColor={colors.textFaint} style={s.input} />
        {conc > 0 && (
          <View style={s.resultBox}>
            <ResultRow label="Concentration" value={`${conc.toFixed(2)} mg/mL`} />
            <ResultRow label="Concentration" value={`${concMcg.toFixed(0)} mcg/mL`} />
          </View>
        )}
      </Card>
      <Card>
        <CardLabel icon="💉">DRAW VOLUME CALCULATOR</CardLabel>
        <Text style={s.calcLabel}>DESIRED DOSE</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TextInput
            placeholder="e.g. 250"
            placeholderTextColor={colors.textFaint}
            value={doseVal}
            onChangeText={setDoseVal}
            keyboardType="numeric"
            style={[s.input, { flex: 1 }]}
          />
          <View style={s.unitToggle}>
            {(['mcg', 'mg'] as const).map(u => (
              <Pressable
                key={u}
                onPress={() => setDoseUnit(u)}
                style={[s.unitBtn, doseUnit === u && s.unitBtnActive]}
              >
                <Text style={[s.unitBtnText, doseUnit === u && s.unitBtnTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {conc <= 0 ? (
          <Text style={s.helpText}>Fill in vial reconstitution above first</Text>
        ) : doseVal ? (
          <View style={s.resultBox}>
            <ResultRow label="Draw Volume" value={`${drawMl.toFixed(3)} mL`} color={colors.accent} />
            <ResultRow label="IU Equivalent" value={`${iu.toFixed(1)} IU`} />
          </View>
        ) : null}
      </Card>
      <Card>
        <CardLabel icon="📋">RETATRUTIDE TITRATION GUIDE</CardLabel>
        <View style={s.tableHead}>
          <Text style={[s.tableHeadCell, { flex: 1 }]}>WEEKS</Text>
          <Text style={[s.tableHeadCell, { flex: 1 }]}>DOSE</Text>
          <Text style={[s.tableHeadCell, { flex: 1 }]}>FREQ</Text>
          <Text style={[s.tableHeadCell, { flex: 1.4 }]}>NOTE</Text>
        </View>
        {[
          ['1-4',   '0.5 mg', 'Weekly', 'Initiation'],
          ['5-8',   '1.0 mg', 'Weekly', 'Escalation'],
          ['9-12',  '2.0 mg', 'Weekly', 'Maintenance'],
          ['13-16', '4.0 mg', 'Weekly', 'Optimization'],
          ['17+',   '8.0 mg', 'Weekly', 'Max dose'],
        ].map((row, i) => (
          <View key={i} style={s.tableRow}>
            <Text style={[s.tableCell, { flex: 1 }]}>{row[0]}</Text>
            <Text style={[s.tableCell, { flex: 1, color: colors.primary, fontWeight: '600' }]}>{row[1]}</Text>
            <Text style={[s.tableCell, { flex: 1 }]}>{row[2]}</Text>
            <Text style={[s.tableCell, { flex: 1.4, color: colors.textMuted, fontSize: 12 }]}>{row[3]}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function ResultRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={s.resultRow}>
      <Text style={s.resultKey}>{label}</Text>
      <Text style={[s.resultVal, color && { color }]}>{value}</Text>
    </View>
  );
}

function SubscriptionTab() {
  return (
    <>
      <View style={s.subHero}>
        <Text style={s.subHeroLogo}>⭐</Text>
        <Text style={s.subHeroTitle}>Prime AI+</Text>
        <Text style={s.subHeroSub}>Coming Soon</Text>
        <Text style={s.subHeroDesc}>
          Unlock personal titration coaching, pattern analysis, and unlimited Q&A with the full pharmacology model.
        </Text>
      </View>
      <Card>
        <CardLabel>CURRENT PLAN</CardLabel>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.planName}>Free Tier</Text>
            <Text style={s.planSub}>Educational AI · Full tracker · Unlimited logs</Text>
          </View>
          <Text style={s.planPrice}>$0</Text>
        </View>
      </Card>
      <Card>
        <CardLabel>PRIME AI+ FEATURES</CardLabel>
        <FeatureRow icon="🎯" title="Personal Titration Coach" desc="Suggests next phase based on your logs" />
        <FeatureRow icon="📊" title="Pattern Analysis" desc="Correlates side effects with dose & site" />
        <FeatureRow icon="💬" title="Unlimited Live AI" desc="Full LLM with research context" />
        <FeatureRow icon="🧬" title="Custom Protocols" desc="Build & save your own titration plans" />
        <FeatureRow icon="📑" title="Priority PDF Reports" desc="Researcher-grade analytics exports" />
        <Pressable
          style={s.notify}
          onPress={() => Alert.alert('Notification set', "We'll email you when Prime AI+ launches.")}
        >
          <Text style={s.notifyText}>🔔  Notify me when available</Text>
        </Pressable>
      </Card>
      <Card>
        <CardLabel>EXPECTED PRICING</CardLabel>
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.priceTier}>Monthly</Text>
          </View>
          <Text style={s.priceVal}>$9.99/mo</Text>
        </View>
        <View style={s.priceRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.priceTier}>Annual</Text>
            <Text style={s.priceSave}>Save 33%</Text>
          </View>
          <Text style={s.priceVal}>$79/yr</Text>
        </View>
      </Card>
    </>
  );
}

function FeatureRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={s.featRow}>
      <Text style={{ fontSize: 20, marginRight: 12 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={s.featTitle}>{title}</Text>
        <Text style={s.featDesc}>{desc}</Text>
      </View>
      <Text style={{ fontSize: 14, opacity: 0.5 }}>🔒</Text>
    </View>
  );
}

function RemindersTab() {
  const [r1, setR1] = useState(false);
  const [r2, setR2] = useState(false);
  const [r3, setR3] = useState(false);
  const { signOut } = useAuth();

  const confirmSignOut = () => {
    Alert.alert('Sign out?', 'You will need to sign back in to access your data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <>
      <Card>
        <CardLabel icon="🔔">NOTIFICATION SETTINGS</CardLabel>
        <ToggleRow title="Injection Reminders" sub="Daily reminder to log injections" on={r1} setOn={setR1} />
        <ToggleRow title="Weekly Summary" sub="Weekly injection summary report" on={r2} setOn={setR2} />
        <ToggleRow title="Progress Photo Reminder" sub="Monthly progress photo prompt" on={r3} setOn={setR3} />
      </Card>
      <Card>
        <CardLabel icon="💾">DATA MANAGEMENT</CardLabel>
        <Pressable style={s.dataBtn} onPress={() => Alert.alert('Export CSV', 'Coming in a future version.')}>
          <Text style={s.dataBtnText}>📊  Export CSV</Text>
        </Pressable>
        <Pressable style={s.dataBtn} onPress={() => Alert.alert('Export PDF', 'Coming in a future version.')}>
          <Text style={s.dataBtnText}>📄  Export PDF</Text>
        </Pressable>
        <Pressable style={s.dataBtn} onPress={() => Alert.alert('Cloud Backup', 'Coming in a future version.')}>
          <Text style={s.dataBtnText}>☁  Backup to Cloud</Text>
        </Pressable>
      </Card>
      <View style={{ paddingHorizontal: spacing.xl }}>
        <Pressable style={s.signOutBtn} onPress={confirmSignOut}>
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
        <Pressable style={s.deleteText} onPress={() => Alert.alert('Delete Account', 'Coming in a future version.')}>
          <Text style={s.signOutText}>Delete Account</Text>
        </Pressable>
      </View>
    </>
  );
}

function ToggleRow({ title, sub, on, setOn }: { title: string; sub: string; on: boolean; setOn: (v: boolean) => void }) {
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
        <Text style={{ fontSize: 18, color: colors.accent, fontWeight: '700' }}>⚠ FOR RESEARCH USE ONLY</Text>
      </View>
      <Text style={s.legalLabel}>IMPORTANT DISCLAIMER</Text>
      <Text style={s.legalP}>All peptides, compounds, and substances referenced in this application are intended SOLELY for research purposes in controlled laboratory settings.</Text>
      <Text style={s.legalP}>These substances are NOT approved for human consumption, self-administration, or therapeutic use by any regulatory authority including the FDA, EMA, or equivalent bodies.</Text>
      <Text style={s.legalP}>MONARCH PRIME PIN TRACKER is a research data logging tool only. It does not constitute medical advice, diagnosis, or treatment recommendations.</Text>
      <Text style={s.legalP}>By using this application, you acknowledge:</Text>
      <View style={{ paddingLeft: 18 }}>
        <Text style={s.legalLi}>• You are a qualified researcher using this for legitimate research purposes only</Text>
        <Text style={s.legalLi}>• You will not use this application to facilitate human consumption of research compounds</Text>
        <Text style={s.legalLi}>• You accept full legal and ethical responsibility for your research activities</Text>
        <Text style={s.legalLi}>• The developers of this application bear no liability for misuse</Text>
      </View>
      <Text style={s.legalP}>Misuse of research peptides may be illegal in your jurisdiction and can pose serious health risks.</Text>
      <Text style={s.legalP}>If you are experiencing a medical emergency, contact emergency services immediately.</Text>
      <Text style={s.legalFooter}>Monarch Prime Pin Tracker v1.0 — Research Use Only</Text>
    </Card>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  subTabs: {
    flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: 14,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 3,
  },
  subTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 9 },
  subTabActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)' },
  subTabText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  subTabTextActive: { color: colors.white },

  calcLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600', letterSpacing: 1.5, marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 14,
    color: colors.text, fontSize: 16, marginBottom: 8,
  },
  unitToggle: {
    flexDirection: 'row', backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, padding: 3,
  },
  unitBtn: { paddingHorizontal: 14, justifyContent: 'center', borderRadius: 9 },
  unitBtnActive: { backgroundColor: 'rgba(30, 136, 229, 0.25)' },
  unitBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  unitBtnTextActive: { color: colors.white },

  helpText: { textAlign: 'center', color: colors.textFaint, fontSize: 13, marginTop: 14 },
  resultBox: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderRadius: 10, padding: 14, marginTop: 12,
  },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  resultKey: { color: colors.textMuted, fontSize: 13 },
  resultVal: { color: colors.primary, fontSize: 16, fontWeight: '700' },

  tableHead: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(30,136,229,0.2)' },
  tableHeadCell: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  tableRow: { flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderFaint, alignItems: 'center' },
  tableCell: { color: colors.white, fontSize: 13 },

  subHero: {
    marginHorizontal: spacing.xl, marginBottom: 14,
    backgroundColor: 'rgba(255, 215, 0, 0.06)',
    borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.4)',
    borderRadius: radius.xl, paddingVertical: 24, paddingHorizontal: 20,
    alignItems: 'center',
  },
  subHeroLogo: { fontSize: 40, marginBottom: 8 },
  subHeroTitle: { fontSize: 26, fontWeight: '700', color: colors.gold, letterSpacing: 1 },
  subHeroSub: { fontSize: 12, color: colors.accent, letterSpacing: 2, fontWeight: '700', marginTop: 4 },
  subHeroDesc: { color: '#C8D4E6', fontSize: 13, marginTop: 12, lineHeight: 20, textAlign: 'center' },
  planName: { color: colors.white, fontSize: 16, fontWeight: '700' },
  planSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  planPrice: { color: colors.teal, fontSize: 22, fontWeight: '700' },
  featRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderFaint },
  featTitle: { color: colors.white, fontSize: 14, fontWeight: '600' },
  featDesc: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  notify: {
    marginTop: 14, backgroundColor: colors.gold, borderRadius: radius.md,
    paddingVertical: 14, alignItems: 'center',
  },
  notifyText: { color: '#0a1628', fontSize: 14, fontWeight: '700' },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderFaint },
  priceTier: { color: colors.white, fontSize: 15, fontWeight: '600' },
  priceVal: { color: colors.gold, fontSize: 16, fontWeight: '700' },
  priceSave: { color: colors.teal, fontSize: 11, fontWeight: '600', marginTop: 2 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderFaint },
  toggleTitle: { color: colors.white, fontSize: 15, fontWeight: '600' },
  toggleSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  dataBtn: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.borderFaint },
  dataBtnText: { color: colors.primary, fontSize: 15, fontWeight: '500' },

  signOutBtn: {
    backgroundColor: 'rgba(229, 57, 53, 0.08)',
    borderWidth: 1, borderColor: 'rgba(229, 57, 53, 0.3)',
    borderRadius: radius.md, paddingVertical: 16, alignItems: 'center',
    marginBottom: 10,
  },
  signOutText: { color: colors.red, fontSize: 15, fontWeight: '600' },
  deleteText: { paddingVertical: 12, alignItems: 'center' },

  legalLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 12 },
  legalP: { color: '#C8D4E6', fontSize: 13, lineHeight: 22, marginBottom: 12 },
  legalLi: { color: '#C8D4E6', fontSize: 13, lineHeight: 22, marginBottom: 4 },
  legalFooter: { textAlign: 'center', color: colors.textFaint, fontSize: 12, marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.borderSubtle },
});
