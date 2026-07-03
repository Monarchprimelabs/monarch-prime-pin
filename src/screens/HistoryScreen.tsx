import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput, Alert, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card } from '../components/UI';
import { colors, spacing, radius, severity as sevColors } from '../theme';
import { Injection } from '../data/peptides';
import { getInjections, deleteInjection } from '../lib/storage';
import { LogInjectionScreen } from './LogInjectionScreen';
import { UpgradeScreen } from './UpgradeScreen';
import { useEntitlements } from '../lib/entitlements';
import { useAuth } from '../lib/auth';

const PRO_TABS = new Set(['calendar', 'photos']);

export function HistoryScreen() {
  const [tab, setTab] = useState<'log' | 'calendar' | 'photos'>('log');
  const [injections, setInjections] = useState<Injection[]>([]);
  const [backdateFor, setBackdateFor] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<Injection | null>(null);
  const [editingRecord, setEditingRecord] = useState<Injection | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const { hasPro } = useEntitlements();
  const { user } = useAuth();
  const canUsePro = hasPro || !!user?.isDeveloper;

  const refresh = async () => {
    try {
      setInjections(await getInjections());
    } catch (e: any) {
      Alert.alert('Unable to load records', e?.message || 'Please try again.');
    }
  };
  useEffect(() => { refresh(); }, []);

  const handleDelete = (record: Injection) => {
    Alert.alert('Delete record?', `${record.peptide} from ${formatDate(record.date)} will be permanently deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteInjection(record.id);
          setSelectedRecord(null);
          await refresh();
        } catch (e: any) {
          Alert.alert('Delete failed', e?.message || 'Please try again.');
        }
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
            onPress={() => (PRO_TABS.has(t) && !canUsePro ? setShowUpgrade(true) : setTab(t))}
            style={[s.subTab, tab === t && s.subTabActive]}
          >
            <Text style={[s.subTabText, tab === t && s.subTabTextActive]}>
              {t === 'log' ? 'Log' : t === 'calendar' ? 'Calendar' : 'Photos'}
              {PRO_TABS.has(t) && !canUsePro ? ' 🔒' : ''}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {tab === 'log' && <LogList injections={injections} onOpen={setSelectedRecord} />}
        {tab === 'calendar' && canUsePro && (
          <CalendarView
            injections={injections}
            onLogForDate={(date) => setBackdateFor(date)}
            onOpen={setSelectedRecord}
          />
        )}
        {tab === 'photos' && canUsePro && <PhotosGrid injections={injections} onOpen={setSelectedRecord} />}
      </ScrollView>

      <Modal visible={showUpgrade} animationType="slide" onRequestClose={() => setShowUpgrade(false)}>
        <UpgradeScreen onClose={() => setShowUpgrade(false)} />
      </Modal>

      <Modal visible={!!backdateFor} animationType="slide" onRequestClose={() => setBackdateFor(null)}>
        {backdateFor && (
          <LogInjectionScreen
            initialDate={backdateFor}
            onDone={() => { setBackdateFor(null); refresh(); }}
            onCancel={() => setBackdateFor(null)}
          />
        )}
      </Modal>

      <Modal visible={!!selectedRecord} animationType="slide" onRequestClose={() => setSelectedRecord(null)}>
        {selectedRecord && (
          <RecordDetail
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onEdit={() => {
              setEditingRecord(selectedRecord);
              setSelectedRecord(null);
            }}
            onDelete={() => handleDelete(selectedRecord)}
          />
        )}
      </Modal>

      <Modal visible={!!editingRecord} animationType="slide" onRequestClose={() => setEditingRecord(null)}>
        {editingRecord && (
          <LogInjectionScreen
            initialInjection={editingRecord}
            onCancel={() => {
              setSelectedRecord(editingRecord);
              setEditingRecord(null);
            }}
            onDone={() => {
              setEditingRecord(null);
              setSelectedRecord(null);
              refresh();
            }}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function severityLabel(value: Injection['sev']) {
  return value === 'none' ? 'None' : value === 'mild' ? 'Mild' : value === 'mod' ? 'Moderate' : 'Severe';
}

function RecordDetail({
  record, onClose, onEdit, onDelete,
}: {
  record: Injection;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <View style={s.detailHeader}>
        <Pressable onPress={onClose} style={s.headerAction} accessibilityRole="button" accessibilityLabel="Close record details">
          <Text style={s.headerActionText}>‹ History</Text>
        </Pressable>
        <Text style={s.detailTitle}>Record Details</Text>
        <Pressable onPress={onEdit} style={s.headerAction} accessibilityRole="button" accessibilityLabel="Edit record">
          <Text style={[s.headerActionText, { textAlign: 'right' }]}>Edit</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={s.detailContent}>
        <View style={[s.detailHero, { borderLeftColor: sevColors[record.sev] }]}>
          <Text style={s.detailName}>{record.peptide}</Text>
          <Text style={s.detailDate}>{formatDate(record.date)} at {record.time}</Text>
          <Text style={s.detailDose}>{record.dose}{record.unit}</Text>
        </View>
        <DetailRow label="Recorded site" value={record.site} />
        <DetailRow label="Side effects" value={severityLabel(record.sev)} />
        {!!record.symptoms?.length && (
          <DetailRow label="Symptoms" value={record.symptoms.join(', ')} />
        )}
        {record.weight > 0 && <DetailRow label="Weight" value={`${record.weight} lbs`} />}
        {!!record.notes && <DetailRow label="Notes" value={record.notes} />}
        {!!record.photoUri && (
          <View style={s.detailSection}>
            <Text style={s.detailLabel}>PROGRESS PHOTO</Text>
            <Image source={{ uri: record.photoUri }} style={s.detailPhoto} />
          </View>
        )}
        <Pressable onPress={onDelete} style={s.detailDelete} accessibilityRole="button" accessibilityLabel="Delete record">
          <Text style={s.detailDeleteText}>Delete Record</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailSection}>
      <Text style={s.detailLabel}>{label.toUpperCase()}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function LogList({ injections, onOpen }: { injections: Injection[]; onOpen: (record: Injection) => void }) {
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
        <Pressable
          key={i.id}
          onPress={() => onOpen(i)}
          style={[s.histCard, { borderLeftColor: sevColors[i.sev] }]}
          accessibilityRole="button"
          accessibilityLabel={`Open ${i.peptide} record from ${formatDate(i.date)}`}
        >
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
                  {severityLabel(i.sev)}
                </Text>
              </View>
            </View>
          </View>
          <Text style={s.viewDetailText}>View details ›</Text>
        </Pressable>
      ))}
    </View>
  );
}

function CalendarView({ injections, onLogForDate, onOpen }: { injections: Injection[]; onLogForDate: (date: string) => void; onOpen: (record: Injection) => void }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(today.getDate());

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const isFuture = (d: number) => {
    const cellDate = new Date(year, month, d);
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return cellDate > todayMidnight;
  };

  const hasInj = (d: number) => injections.some(i => i.date === dateStr(d));
  const dayInj = injections.filter(i => i.date === dateStr(selected));
  const selectedDateStr = dateStr(selected);
  const selectedIsFuture = isFuture(selected);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const navPrev = () => {
    setSelected(1);
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const navNext = () => {
    if (isCurrentMonth) return;
    setSelected(1);
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  return (
    <>
      <Card>
        <View style={s.calHeader}>
          <Pressable onPress={navPrev} style={s.calNav} accessibilityRole="button" accessibilityLabel="Previous month">
            <Text style={s.calNavText}>‹</Text>
          </Pressable>
          <Text style={s.calMonth}>{monthNames[month]} {year}</Text>
          <Pressable
            onPress={navNext}
            style={[s.calNav, isCurrentMonth && s.calNavDisabled]}
            disabled={isCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Next month"
            accessibilityState={{ disabled: isCurrentMonth }}
          >
            <Text style={[s.calNavText, isCurrentMonth && s.calNavTextDisabled]}>›</Text>
          </Pressable>
        </View>
        <View style={s.calGrid}>
          {dayNames.map(d => (
            <Text key={d} style={s.calDayName}>{d}</Text>
          ))}
          {cells.map((d, i) => {
            const future = d !== null && isFuture(d);
            return (
              <Pressable
                key={i}
                onPress={() => d && !future && setSelected(d)}
                style={[
                  s.calCell,
                  d === selected && s.calCellSel,
                  (d === null || future) && { opacity: future ? 0.3 : 0 },
                ]}
                disabled={d === null || future}
              >
                {d !== null && <Text style={s.calCellText}>{d}</Text>}
                {d !== null && hasInj(d) && <View style={s.calDot} />}
              </Pressable>
            );
          })}
        </View>
      </Card>
      <Card>
        <Text style={s.calSelDate}>{monthNames[month]} {selected}, {year}</Text>
        {dayInj.length === 0 ? (
          <Text style={s.empty}>No injections logged</Text>
        ) : dayInj.map(i => (
          <Pressable key={i.id} onPress={() => onOpen(i)} style={[s.histCard, { borderLeftColor: sevColors[i.sev], marginHorizontal: 0 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={s.histName}>{i.peptide}</Text>
                <Text style={s.histMeta}>{i.time}</Text>
                <Text style={s.histMeta}>📍 {i.site}</Text>
              </View>
              <Text style={s.histDose}>{i.dose}{i.unit}</Text>
            </View>
          </Pressable>
        ))}
        {!selectedIsFuture && (
          <Pressable
            style={s.logForDateBtn}
            onPress={() => onLogForDate(selectedDateStr)}
          >
            <Text style={s.logForDateText}>+ Log for {monthNames[month]} {selected}</Text>
          </Pressable>
        )}
      </Card>
    </>
  );
}

function PhotosGrid({ injections, onOpen }: { injections: Injection[]; onOpen: (record: Injection) => void }) {
  const photos = injections.filter(i => i.photoUri);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const comparePair = compareIds
    .map(id => photos.find(p => p.id === id))
    .filter((p): p is Injection => !!p);

  const toggleCompareSelection = (record: Injection) => {
    setCompareIds(current => {
      if (current.includes(record.id)) return current.filter(id => id !== record.id);
      // Oldest selection drops off so the third tap swaps rather than blocks.
      return [...current.slice(-1), record.id];
    });
  };

  if (photos.length === 0) {
    return <Text style={[s.empty, { paddingTop: 40 }]}>No progress photos yet</Text>;
  }
  return (
    <View>
      {photos.length >= 2 && (
        <Pressable
          style={s.compareToggle}
          onPress={() => { setCompareMode(current => !current); setCompareIds([]); }}
        >
          <Text style={s.compareToggleText}>
            {compareMode ? 'Cancel Compare' : 'Compare Two Photos'}
          </Text>
        </Pressable>
      )}
      {compareMode && (
        <Text style={s.compareHint}>
          {comparePair.length < 2 ? `Select ${2 - comparePair.length} photo${comparePair.length === 1 ? '' : 's'} to compare` : 'Comparing'}
        </Text>
      )}
      <View style={s.photoGrid}>
        {photos.map(p => {
          const selectedIndex = compareIds.indexOf(p.id);
          return (
            <Pressable
              key={p.id}
              style={[s.photoThumb, compareMode && selectedIndex >= 0 && s.photoThumbSelected]}
              onPress={() => (compareMode ? toggleCompareSelection(p) : onOpen(p))}
              accessibilityRole="button"
              accessibilityLabel={compareMode ? `Select photo from ${formatDate(p.date)} for comparison` : `Open photo record from ${formatDate(p.date)}`}
            >
              <Image source={{ uri: p.photoUri }} style={s.photoThumbImg} />
              <Text style={s.photoThumbDate}>{p.date}</Text>
              {compareMode && selectedIndex >= 0 && (
                <View style={s.compareBadge}><Text style={s.compareBadgeText}>{selectedIndex + 1}</Text></View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={compareMode && comparePair.length === 2}
        animationType="slide"
        onRequestClose={() => setCompareIds([])}
      >
        {comparePair.length === 2 && (
          <SafeAreaView style={s.app}>
            <View style={s.compareHeader}>
              <Text style={s.compareTitle}>Photo Comparison</Text>
              <Pressable onPress={() => setCompareIds([])} style={s.headerAction}>
                <Text style={[s.headerActionText, { textAlign: 'right' }]}>Close</Text>
              </Pressable>
            </View>
            <View style={s.compareRow}>
              {[...comparePair]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(record => (
                  <View key={record.id} style={s.comparePane}>
                    <Image source={{ uri: record.photoUri }} style={s.compareImg} resizeMode="cover" />
                    <Text style={s.compareDate}>{formatDate(record.date)}</Text>
                    <Text style={s.compareMeta}>{record.peptide}</Text>
                  </View>
                ))}
            </View>
          </SafeAreaView>
        )}
      </Modal>
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
  viewDetailText: { color: colors.primary, fontSize: 12, fontWeight: '700', marginTop: 10, alignSelf: 'flex-end' },

  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 20 },

  calHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  calMonth: { color: colors.white, fontSize: 16, fontWeight: '700' },
  calNav: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  calNavText: { color: colors.primary, fontSize: 18, fontWeight: '700' },
  calNavDisabled: { backgroundColor: colors.bgInput },
  calNavTextDisabled: { color: colors.textDim },
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
  logForDateBtn: {
    marginTop: 14,
    backgroundColor: 'rgba(30, 136, 229, 0.15)',
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.4)',
    borderRadius: radius.md, paddingVertical: 14, alignItems: 'center',
  },
  logForDateText: { color: colors.primary, fontSize: 14, fontWeight: '700' },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.xl, gap: 8 },
  photoThumb: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoThumbDate: { position: 'absolute', bottom: 6, left: 8, color: colors.white, fontSize: 11, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 4 },
  photoThumbSelected: { borderWidth: 2, borderColor: colors.teal, borderRadius: 8 },
  compareToggle: {
    marginHorizontal: spacing.xl, marginBottom: 10, minHeight: 44,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  compareToggleText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  compareHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginBottom: 10 },
  compareBadge: {
    position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11,
    backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center',
  },
  compareBadgeText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  compareHeader: {
    minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  compareTitle: { color: colors.white, fontSize: 17, fontWeight: '700' },
  compareRow: { flex: 1, flexDirection: 'row', gap: 10, padding: spacing.xl },
  comparePane: { flex: 1 },
  compareImg: { width: '100%', flex: 1, borderRadius: radius.md, backgroundColor: colors.bgInput },
  compareDate: { color: colors.white, fontSize: 13, fontWeight: '700', marginTop: 10 },
  compareMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },

  detailHeader: {
    minHeight: 58, paddingHorizontal: spacing.xl, flexDirection: 'row',
    alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  headerAction: { width: 86, minHeight: 44, justifyContent: 'center' },
  headerActionText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  detailTitle: { flex: 1, color: colors.white, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  detailContent: { padding: spacing.xl, paddingBottom: 50 },
  detailHero: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderLeftWidth: 4, borderRadius: radius.lg, padding: 18, marginBottom: spacing.lg,
  },
  detailName: { color: colors.white, fontSize: 21, fontWeight: '700', marginBottom: 5 },
  detailDate: { color: colors.textMuted, fontSize: 13 },
  detailDose: { color: colors.primary, fontSize: 24, fontWeight: '700', marginTop: 14 },
  detailSection: {
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.borderSubtle,
    borderRadius: radius.md, padding: 16, marginBottom: 10,
  },
  detailLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 7 },
  detailValue: { color: colors.text, fontSize: 15, lineHeight: 22 },
  detailPhoto: { width: '100%', aspectRatio: 1, resizeMode: 'cover', borderRadius: radius.sm },
  detailDelete: {
    minHeight: 48, borderWidth: 1, borderColor: colors.red, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg,
  },
  detailDeleteText: { color: colors.red, fontSize: 14, fontWeight: '700' },
});
