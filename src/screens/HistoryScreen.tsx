import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card } from '../components/UI';
import { colors, spacing, radius, severity as sevColors } from '../theme';
import { Injection } from '../data/peptides';
import { getInjections, deleteInjection } from '../lib/storage';

export function HistoryScreen() {
  const [tab, setTab] = useState<'log' | 'calendar' | 'photos'>('log');
  const [injections, setInjections] = useState<Injection[]>([]);

  const refresh = () => getInjections().then(setInjections);
  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete injection?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await deleteInjection(id);
        refresh();
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <Header title="History" />
      <View style={s.subTabs}>
        {(['log', 'calendar', 'photos'] as const).map(t => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[s.subTab, tab === t && s.subTabActive]}
          >
            <Text style={[s.subTabText, tab === t && s.subTabTextActive]}>
              {t === 'log' ? 'Log' : t === 'calendar' ? 'Calendar' : 'Photos'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {tab === 'log' && <LogList injections={injections} onDelete={handleDelete} />}
        {tab === 'calendar' && <CalendarView injections={injections} />}
        {tab === 'photos' && <PhotosGrid injections={injections} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function LogList({ injections, onDelete }: { injections: Injection[]; onDelete: (id: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'none' | 'mild' | 'mod' | 'sev'>('all');
  const [q, setQ] = useState('');
  const filtered = injections.filter(i => {
    if (filter !== 'all' && i.sev !== filter) return false;
    if (q && !i.peptide.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <View style={{ paddingHorizontal: spacing.xl }}>
      <TextInput
        style={s.search}
        placeholder="Search logs…"
        placeholderTextColor={colors.textFaint}
        value={q}
        onChangeText={setQ}
      />
      <View style={s.filterRow}>
        {[
          { v: 'all',  label: 'All' },
          { v: 'none', label: 'None' },
          { v: 'mild', label: 'Mild' },
          { v: 'mod',  label: 'Moderate' },
          { v: 'sev',  label: 'Severe' },
        ].map(f => (
          <Pressable
            key={f.v}
            onPress={() => setFilter(f.v as any)}
            style={[s.pill, filter === f.v && s.pillActive]}
          >
            <Text style={[s.pillText, filter === f.v && s.pillTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      {filtered.length === 0 ? (
        <Text style={s.empty}>No injections logged yet</Text>
      ) : filtered.map(i => (
        <View key={i.id} style={[s.histCard, { borderLeftColor: sevColors[i.sev] }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={s.histName}>{i.peptide}</Text>
              <Text style={s.histMeta}>{i.date} · {i.time}</Text>
              <Text style={s.histMeta}>📍 {i.site}</Text>
              {i.weight > 0 && <Text style={s.histMeta}>⚖ {i.weight} lbs</Text>}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.histDose}>{i.dose}{i.unit}</Text>
              <View style={[s.sevBadge, { backgroundColor: sevColors[i.sev] + '20' }]}>
                <Text style={[s.sevBadgeText, { color: sevColors[i.sev] }]}>
                  {i.sev === 'none' ? 'None' : i.sev === 'mild' ? 'Mild' : i.sev === 'mod' ? 'Moderate' : 'Severe'}
                </Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => onDelete(i.id)} style={s.delBtn}>
            <Text style={s.delText}>Delete</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

function CalendarView({ injections }: { injections: Injection[] }) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [selected, setSelected] = useState(new Date().getDate());

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const hasInj = (d: number) => injections.some(i => i.date === dateStr(d));
  const dayInj = injections.filter(i => i.date === dateStr(selected));

  return (
    <>
      <Card>
        <View style={s.calHeader}>
          <Pressable
            onPress={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}
            style={s.calNav}
          >
            <Text style={s.calNavText}>‹</Text>
          </Pressable>
          <Text style={s.calMonth}>{monthNames[month]} {year}</Text>
          <Pressable
            onPress={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}
            style={s.calNav}
          >
            <Text style={s.calNavText}>›</Text>
          </Pressable>
        </View>
        <View style={s.calGrid}>
          {dayNames.map(d => (
            <Text key={d} style={s.calDayName}>{d}</Text>
          ))}
          {cells.map((d, i) => (
            <Pressable
              key={i}
              onPress={() => d && setSelected(d)}
              style={[s.calCell, d === selected && s.calCellSel, d === null && { opacity: 0 }]}
              disabled={d === null}
            >
              {d !== null && <Text style={s.calCellText}>{d}</Text>}
              {d !== null && hasInj(d) && <View style={s.calDot} />}
            </Pressable>
          ))}
        </View>
      </Card>
      <Card>
        <Text style={s.calSelDate}>{monthNames[month]} {selected}, {year}</Text>
        {dayInj.length === 0 ? (
          <Text style={s.empty}>No injections logged</Text>
        ) : dayInj.map(i => (
          <View key={i.id} style={[s.histCard, { borderLeftColor: sevColors[i.sev], marginHorizontal: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.histName}>{i.peptide}</Text>
                <Text style={s.histMeta}>{i.time}</Text>
                <Text style={s.histMeta}>📍 {i.site}</Text>
              </View>
              <Text style={s.histDose}>{i.dose}{i.unit}</Text>
            </View>
          </View>
        ))}
      </Card>
    </>
  );
}

function PhotosGrid({ injections }: { injections: Injection[] }) {
  const photos = injections.filter(i => i.photoUri);
  if (photos.length === 0) {
    return <Text style={[s.empty, { paddingTop: 40 }]}>No progress photos yet</Text>;
  }
  return (
    <View style={s.photoGrid}>
      {photos.map(p => (
        <View key={p.id} style={s.photoThumb}>
          <Image source={{ uri: p.photoUri }} style={s.photoThumbImg} />
          <Text style={s.photoThumbDate}>{p.date}</Text>
        </View>
      ))}
    </View>
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
  subTabText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  subTabTextActive: { color: colors.white },

  search: {
    backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12,
    color: colors.text, fontSize: 14, marginBottom: 12,
  },
  filterRow: { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  pill: {
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  pillActive: { borderColor: colors.primary },
  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  pillTextActive: { color: colors.primary },

  histCard: {
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.borderSubtle,
    borderLeftWidth: 4, borderRadius: radius.lg,
    padding: 16, marginBottom: 10,
  },
  histName: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  histMeta: { color: colors.textMuted, fontSize: 12, lineHeight: 20 },
  histDose: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  sevBadgeText: { fontSize: 11, fontWeight: '600' },
  delBtn: { alignSelf: 'flex-end', paddingTop: 6 },
  delText: { color: colors.red, fontSize: 14, fontWeight: '600' },

  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonth: { color: colors.white, fontSize: 16, fontWeight: '700' },
  calNav: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  calNavText: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayName: { width: '14.28%', textAlign: 'center', color: colors.textMuted, fontSize: 11, fontWeight: '600', paddingVertical: 6 },
  calCell: {
    width: '14.28%', aspectRatio: 1,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8,
  },
  calCellSel: { backgroundColor: 'rgba(30, 136, 229, 0.4)' },
  calCellText: { color: colors.white, fontSize: 14 },
  calDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.teal, marginTop: 2 },
  calSelDate: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 8 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: 8 },
  photoThumb: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoThumbDate: { position: 'absolute', bottom: 6, left: 8, color: colors.white, fontSize: 11, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
});
