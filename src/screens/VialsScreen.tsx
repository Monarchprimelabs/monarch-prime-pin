import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card, CardLabel, Disclaimer } from '../components/UI';
import { kit, ShellHeader } from '../components/FormKit';
import { colors, radius } from '../theme';
import { Injection } from '../data/peptides';
import { useI18n } from '../lib/i18n';
import { localDateISO, parseLocalDay } from '../lib/dates';
import {
  deleteVial, getDoseSkips, getInjections, getInventory, getProtocols, getVials,
  InventoryItem, newProtocolId, saveVial, updateInventoryItem,
} from '../lib/storage';
import { syncProtocolReminders } from '../lib/protocolReminders';
import { addDays } from '../lib/schedule/days';
import { DoseSkip, Protocol } from '../lib/schedule/types';
import { concentration, formatVialAmount, projectVial, toVialTotal, VialProjection } from '../lib/vials/math';
import { Vial, VialAmountUnit } from '../lib/vials/types';
import { COMPOUND_NAMES, formatDay } from './ProtocolsScreen';

const AMOUNT_UNITS: VialAmountUnit[] = ['mg', 'mcg', 'IU'];
const toNumber = (value: string) => Number(String(value).replace(',', '.'));

type Data = { vials: Vial[]; protocols: Protocol[]; records: Injection[]; skips: DoseSkip[]; inventory: InventoryItem[] };

async function loadData(): Promise<Data> {
  const [vials, protocols, records, skips, inventory] = await Promise.all([
    getVials(), getProtocols(), getInjections(), getDoseSkips(), getInventory(),
  ]);
  return { vials, protocols, records, skips, inventory };
}

// ============================================================
// VIALS (S16)
// ============================================================
export function VialsTool({ onClose }: { onClose: () => void }) {
  const { t, dateLocale } = useI18n();
  const [data, setData] = useState<Data | null>(null);
  const [editing, setEditing] = useState<Vial | 'new' | null>(null);
  const refresh = () => loadData().then(setData).catch(() => setData({ vials: [], protocols: [], records: [], skips: [], inventory: [] }));
  useEffect(() => { refresh(); }, []);

  const today = localDateISO();
  const projections = useMemo(() => {
    const map = new Map<string, VialProjection>();
    data?.vials.forEach(vial => map.set(vial.id, projectVial(vial, data.protocols, data.records, data.skips, today)));
    return map;
  }, [data, today]);

  if (editing && data) {
    return (
      <VialForm
        initial={editing === 'new' ? undefined : editing}
        inventory={data.inventory}
        onCancel={() => setEditing(null)}
        onSaved={() => { setEditing(null); refresh(); syncProtocolReminders().catch(() => undefined); }}
      />
    );
  }

  const setStatus = async (vial: Vial, status: Vial['status']) => {
    await saveVial({ ...vial, status, updatedAt: new Date().toISOString() });
    syncProtocolReminders().catch(() => undefined);
    refresh();
  };
  const confirmDelete = (vial: Vial) => {
    Alert.alert(t('vial.deleteTitle'), t('vial.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: async () => {
        await deleteVial(vial.id);
        syncProtocolReminders().catch(() => undefined);
        refresh();
      } },
    ]);
  };

  const active = data?.vials.filter(v => v.status === 'active') ?? [];
  const empty = data?.vials.filter(v => v.status === 'empty') ?? [];

  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <ShellHeader title={t('vial.title')} backLabel={t('settings.backToTools')} onBack={onClose} />
      <ScrollView contentContainerStyle={s.scrollContent}>
        <View style={s.notice}><Text style={s.noticeText}>{t('vial.notice')}</Text></View>
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Pressable style={s.primaryBtn} onPress={() => setEditing('new')} accessibilityRole="button">
            <Text style={s.primaryBtnText}>{t('vial.add')}</Text>
          </Pressable>
        </View>
        {data && active.length === 0 && (
          <Card><Text style={s.empty}>{t('vial.none')}</Text></Card>
        )}
        {data && active.map(vial => (
          <VialCard
            key={vial.id}
            vial={vial}
            projection={projections.get(vial.id)!}
            protocols={data.protocols.filter(p => p.status === 'active' && p.vialId === vial.id)}
            onEdit={() => setEditing(vial)}
            onToggleEmpty={() => setStatus(vial, 'empty')}
            onDelete={() => confirmDelete(vial)}
          />
        ))}
        {empty.length > 0 && data && (
          <Card>
            <CardLabel icon="✓">{t('vial.emptySection')}</CardLabel>
            {empty.map(vial => (
              <View key={vial.id} style={s.listItem}>
                <View style={{ flex: 1 }}>
                  <Text style={s.listTitle}>{vial.label}</Text>
                  <Text style={s.listMeta}>{t('vial.openedOn', { date: formatDay(vial.openedAt, dateLocale) })}</Text>
                  <View style={s.itemActions}>
                    <Pressable style={s.smallBtn} onPress={() => setStatus(vial, 'active')} accessibilityRole="button">
                      <Text style={s.smallBtnText}>{t('vial.reopen')}</Text>
                    </Pressable>
                    <Pressable style={s.smallBtn} onPress={() => confirmDelete(vial)} accessibilityRole="button">
                      <Text style={[s.smallBtnText, { color: colors.red }]}>{t('common.delete')}</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function VialCard({ vial, projection, protocols, onEdit, onToggleEmpty, onDelete }: {
  vial: Vial;
  projection: VialProjection;
  protocols: Protocol[];
  onEdit: () => void;
  onToggleEmpty: () => void;
  onDelete: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const conc = concentration(vial);
  const concLabel = vial.base === 'IU' ? `${Math.round(conc * 100) / 100} IU/mL`
    : conc >= 1000 ? `${Math.round(conc / 10) / 100} mg/mL` : `${Math.round(conc * 100) / 100} mcg/mL`;
  const fraction = vial.total > 0 ? Math.max(0, Math.min(1, projection.remaining / vial.total)) : 0;
  const tone = projection.status === 'empty' || projection.status === 'expired' ? colors.red
    : projection.status === 'low' ? colors.accentLight : colors.primary;

  let line = '';
  if (projection.status === 'empty') line = t('vial.statusEmpty');
  else if (projection.status === 'noPlan') line = t('vial.statusNoPlan');
  else if (projection.firstShort) {
    const through = addDays(projection.firstShort.date, -1);
    line = projection.daysLeft === 0
      ? t('vial.statusShortToday')
      : t('vial.statusThrough', { date: formatDay(through, dateLocale), n: projection.daysLeft ?? 0 });
  } else line = t('vial.statusYear');

  return (
    <Card>
      <View style={st.headRow}>
        <Text style={st.title}>{vial.label}</Text>
        {projection.status === 'low' && <Text style={[st.badge, { color: colors.accentLight }]}>{t('vial.badgeLow')}</Text>}
        {projection.status === 'expired' && <Text style={[st.badge, { color: colors.red }]}>{t('vial.badgeExpired')}</Text>}
      </View>
      <Text style={st.meta}>
        {t('vial.mix', { amount: formatVialAmount(vial.total, vial.base), ml: vial.diluentMl, conc: concLabel })}
      </Text>
      <View style={st.track}><View style={[st.fill, { width: `${fraction * 100}%`, backgroundColor: tone }]} /></View>
      <Text style={st.meta}>
        {t('vial.remaining', { left: formatVialAmount(projection.remaining, vial.base), total: formatVialAmount(vial.total, vial.base) })}
      </Text>
      <Text style={[st.line, projection.status === 'low' && { color: colors.accentLight }]}>{line}</Text>
      {protocols.length > 0 && (
        <Text style={st.meta}>{t('vial.drawnBy', { names: protocols.map(p => p.compound).join(', ') })}</Text>
      )}
      {projection.unconvertedPlans > 0 && <Text style={st.meta}>{t('vial.unconverted')}</Text>}
      <Text style={st.meta}>
        {t('vial.openedOn', { date: formatDay(vial.openedAt, dateLocale) })}
        {vial.expiresAt ? `  ·  ${t(projection.status === 'expired' ? 'vial.expiredOn' : 'vial.expiresOn', { date: formatDay(vial.expiresAt, dateLocale) })}` : ''}
      </Text>
      <View style={s.itemActions}>
        <Pressable style={s.smallBtn} onPress={onEdit} accessibilityRole="button">
          <Text style={s.smallBtnText}>{t('history.edit')}</Text>
        </Pressable>
        <Pressable style={s.smallBtn} onPress={onToggleEmpty} accessibilityRole="button">
          <Text style={s.smallBtnText}>{t('vial.markEmpty')}</Text>
        </Pressable>
        <Pressable style={s.smallBtn} onPress={onDelete} accessibilityRole="button">
          <Text style={[s.smallBtnText, { color: colors.red }]}>{t('common.delete')}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function VialForm({ initial, inventory, onCancel, onSaved }: {
  initial?: Vial;
  inventory: InventoryItem[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t, dateLocale } = useI18n();
  const enteredTotal = initial
    ? String(initial.enteredUnit === 'mg' ? initial.total / 1000 : initial.total)
    : '';
  const [label, setLabel] = useState(initial?.label ?? '');
  const [amount, setAmount] = useState(enteredTotal);
  const [unit, setUnit] = useState<VialAmountUnit>(initial?.enteredUnit ?? 'mg');
  const [diluent, setDiluent] = useState(initial ? String(initial.diluentMl) : '');
  const [openedAt, setOpenedAt] = useState(initial?.openedAt ?? localDateISO());
  const [expiresAt, setExpiresAt] = useState<string | undefined>(initial?.expiresAt);
  const [inventoryItemId, setInventoryItemId] = useState<string | undefined>(initial?.inventoryItemId);
  const [picker, setPicker] = useState<'opened' | 'expires' | null>(null);

  const stock = inventory.filter(item => item.quantity > 0 || item.id === initial?.inventoryItemId);
  const matches = useMemo(() => {
    const q = label.trim().toLowerCase();
    return q ? COMPOUND_NAMES.filter(n => n.toLowerCase().includes(q) && n !== label).slice(0, 6) : [];
  }, [label]);

  const save = async () => {
    const total = toNumber(amount);
    const ml = toNumber(diluent);
    if (!label.trim()) { Alert.alert(t('vial.checkTitle'), t('vial.checkLabel')); return; }
    if (!Number.isFinite(total) || total <= 0) { Alert.alert(t('vial.checkTitle'), t('vial.checkAmount')); return; }
    if (!Number.isFinite(ml) || ml <= 0) { Alert.alert(t('vial.checkTitle'), t('vial.checkDiluent')); return; }
    if (expiresAt && expiresAt < openedAt) { Alert.alert(t('vial.checkTitle'), t('vial.checkDates')); return; }
    const nowIso = new Date().toISOString();
    const vial: Vial = {
      id: initial?.id ?? newProtocolId(),
      label: label.trim(),
      ...toVialTotal(total, unit),
      enteredUnit: unit,
      diluentMl: ml,
      openedAt,
      expiresAt,
      inventoryItemId,
      status: initial?.status ?? 'active',
      createdAt: initial?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };
    try {
      await saveVial(vial);
      // Opening a vial from stock takes one off that item, once.
      const item = inventory.find(i => i.id === inventoryItemId);
      if (item && inventoryItemId !== initial?.inventoryItemId && item.quantity > 0) {
        await updateInventoryItem({ ...item, quantity: item.quantity - 1 }).catch(() => undefined);
      }
      onSaved();
    } catch (error: any) {
      Alert.alert(t('settings.saveFailedTitle'), error?.message || t('common.tryAgain'));
    }
  };

  const pickerNode = picker && (
    <View style={s.pickerWrap}>
      <DateTimePicker
        value={parseLocalDay((picker === 'opened' ? openedAt : expiresAt) ?? localDateISO())}
        mode="date"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        themeVariant={colors.statusBar === 'light' ? 'dark' : 'light'}
        accentColor={colors.primary}
        onChange={(event, selected) => {
          const which = picker;
          if (Platform.OS !== 'ios') setPicker(null);
          if (!selected || event.type === 'dismissed') return;
          if (which === 'opened') setOpenedAt(localDateISO(selected)); else setExpiresAt(localDateISO(selected));
        }}
      />
      {Platform.OS === 'ios' && (
        <Pressable style={s.pickerDone} onPress={() => setPicker(null)}>
          <Text style={s.pickerDoneText}>{t('common.done')}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.app}>
      <Disclaimer />
      <ShellHeader title={initial ? t('vial.editTitle') : t('vial.add')} backLabel={t('common.cancel')} onBack={onCancel} />
      <ScrollView contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        <Card>
          <CardLabel icon="◆">{t('vial.label')}</CardLabel>
          <TextInput value={label} onChangeText={setLabel} placeholder={t('proto.compoundPh')} placeholderTextColor={colors.textFaint} style={s.input} />
          {matches.length > 0 && (
            <View style={s.chipWrap}>
              {matches.map(name => (
                <Pressable key={name} style={s.chip} onPress={() => setLabel(name)} accessibilityRole="button">
                  <Text style={s.chipText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
        <Card>
          <CardLabel icon="▱">{t('vial.contents')}</CardLabel>
          <Text style={s.fieldLabel}>{t('vial.totalLabel')}</Text>
          <TextInput value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={t('vial.totalPh')} placeholderTextColor={colors.textFaint} style={s.input} />
          <View style={[s.unitRow, { marginBottom: 12 }]}>
            {AMOUNT_UNITS.map(u => (
              <Pressable key={u} style={[s.unitBtn, unit === u && s.unitBtnActive]} onPress={() => setUnit(u)} accessibilityRole="radio" accessibilityState={{ selected: unit === u }}>
                <Text style={[s.unitText, unit === u && s.unitTextActive]}>{u}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={s.fieldLabel}>{t('vial.diluentLabel')}</Text>
          <TextInput value={diluent} onChangeText={setDiluent} keyboardType="decimal-pad" placeholder={t('vial.diluentPh')} placeholderTextColor={colors.textFaint} style={s.input} />
          <Text style={s.helper}>{t('vial.contentsHelp')}</Text>
        </Card>
        <Card>
          <CardLabel icon="📅">{t('vial.dates')}</CardLabel>
          <Text style={s.fieldLabel}>{t('vial.opened')}</Text>
          <Pressable style={[s.input, s.pickerField]} onPress={() => setPicker('opened')} accessibilityRole="button">
            <Text style={s.pickerFieldText}>{formatDay(openedAt, dateLocale)}</Text>
          </Pressable>
          {picker === 'opened' && pickerNode}
          <Text style={s.fieldLabel}>{t('vial.expires')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[s.input, s.pickerField]} onPress={() => setPicker('expires')} accessibilityRole="button">
              <Text style={s.pickerFieldText}>{expiresAt ? formatDay(expiresAt, dateLocale) : t('vial.noExpiry')}</Text>
            </Pressable>
            {!!expiresAt && (
              <Pressable style={st.clearBtn} onPress={() => setExpiresAt(undefined)} accessibilityRole="button" accessibilityLabel={t('vial.clearExpiry')}>
                <Text style={{ color: colors.red, fontSize: 22 }}>×</Text>
              </Pressable>
            )}
          </View>
          {picker === 'expires' && pickerNode}
        </Card>
        {stock.length > 0 && (
          <Card>
            <CardLabel icon="📦">{t('vial.fromStock')}</CardLabel>
            <View style={s.chipWrap}>
              <Pressable style={[s.chip, !inventoryItemId && s.chipActive]} onPress={() => setInventoryItemId(undefined)} accessibilityRole="radio">
                <Text style={[s.chipText, !inventoryItemId && s.chipTextActive]}>{t('vial.noStock')}</Text>
              </Pressable>
              {stock.map(item => (
                <Pressable key={item.id} style={[s.chip, inventoryItemId === item.id && s.chipActive]} onPress={() => setInventoryItemId(item.id)} accessibilityRole="radio">
                  <Text style={[s.chipText, inventoryItemId === item.id && s.chipTextActive]}>{`${item.name} (${item.quantity})`}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.helper}>{t('vial.fromStockHelp')}</Text>
          </Card>
        )}
        <View style={{ paddingHorizontal: 20 }}>
          <Pressable style={s.primaryBtn} onPress={save} accessibilityRole="button">
            <Text style={s.primaryBtnText}>{t('vial.save')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = kit;
const st = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { color: colors.white, fontSize: 16, fontWeight: '700', flex: 1 },
  badge: { fontSize: 12, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  line: { color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 6 },
  track: { height: 6, borderRadius: radius.pill, backgroundColor: colors.bgPill, marginTop: 12, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
  clearBtn: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
});
