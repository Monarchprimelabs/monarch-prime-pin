import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, CardLabel } from './UI';
import { colors, radius, withAlpha } from '../theme';
import { formatClockTime, Injection } from '../data/peptides';
import { useI18n } from '../lib/i18n';
import { localDateISO, parseLocalDay } from '../lib/dates';
import { getDoseSkips, getProtocols, removeDoseSkip, saveDoseSkip } from '../lib/storage';
import { syncProtocolReminders } from '../lib/protocolReminders';
import { addDays, weekdayOf } from '../lib/schedule/days';
import { occurrencesBetween } from '../lib/schedule/engine';
import { OccurrenceView, unplannedOn, withStatus } from '../lib/schedule/status';
import { DoseSkip, Protocol } from '../lib/schedule/types';
import type { PlannedDose } from '../screens/LogInjectionScreen';
import { weekdayName, weekdayOrder } from '../screens/ProtocolsScreen';

export type PlanData = { protocols: Protocol[]; skips: DoseSkip[] };

export async function loadPlan(): Promise<PlanData> {
  const [protocols, skips] = await Promise.all([getProtocols(), getDoseSkips()]);
  return { protocols, skips };
}

export function toPlannedDose(view: OccurrenceView): PlannedDose {
  return {
    protocolId: view.protocolId,
    occurrenceKey: view.key,
    compound: view.compound,
    amount: view.amount,
    unit: view.unit,
    date: view.date,
    time: view.time,
  };
}

type Props = {
  injections: Injection[];
  /** Bump to reload protocols and skips after an edit elsewhere. */
  refreshToken: number;
  onLog: (dose: PlannedDose) => void;
  onOpenRecord: (record: Injection) => void;
  onSetup: () => void;
};

function weekStartFor(date: string, firstDay: number): string {
  return addDays(date, -((weekdayOf(date) - firstDay + 7) % 7));
}

// S08 Today: week strip plus the selected day's planned doses.
export function TodayPlan({ injections, refreshToken, onLog, onOpenRecord, onSetup }: Props) {
  const { t, dateLocale } = useI18n();
  const today = localDateISO();
  const order = weekdayOrder(dateLocale);
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [selected, setSelected] = useState(today);
  const [weekStart, setWeekStart] = useState(() => weekStartFor(today, order[0]));

  const reload = useCallback(() => { loadPlan().then(setPlan).catch(() => setPlan({ protocols: [], skips: [] })); }, []);
  useEffect(() => { reload(); }, [reload, refreshToken]);

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const weekViews = useMemo(() => plan
    ? withStatus(occurrencesBetween(plan.protocols, weekDays[0], weekDays[6]), injections, plan.skips, today)
    : [], [plan, weekDays, injections, today]);

  if (!plan) return null;
  const hasActive = plan.protocols.some(p => p.status === 'active');
  if (!hasActive && weekViews.length === 0) {
    return (
      <Card>
        <CardLabel icon="🗓">{t('proto.todayLabel')}</CardLabel>
        <Text style={s.emptyText}>{t('proto.todayEmpty')}</Text>
        <Pressable style={s.setupBtn} onPress={onSetup} accessibilityRole="button">
          <Text style={s.setupBtnText}>{t('proto.setUp')}</Text>
        </Pressable>
      </Card>
    );
  }

  const dayViews = weekViews.filter(v => v.date === selected);
  const extras = unplannedOn(injections, selected, new Set(dayViews.map(v => v.key)));
  const label = selected === today
    ? t('proto.todayLabel')
    : parseLocalDay(selected).toLocaleDateString(dateLocale, { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

  const skip = async (view: OccurrenceView) => {
    await saveDoseSkip(view.key);
    syncProtocolReminders().catch(() => undefined);
    reload();
  };
  const unskip = async (view: OccurrenceView) => {
    await removeDoseSkip(view.key);
    syncProtocolReminders().catch(() => undefined);
    reload();
  };

  const page = (weeks: number) => {
    const next = addDays(weekStart, weeks * 7);
    setWeekStart(next);
    setSelected(next <= today && today <= addDays(next, 6) ? today : next);
  };

  return (
    <Card>
      <View style={s.headRow}>
        <CardLabel icon="🗓">{label}</CardLabel>
        <Pressable onPress={onSetup} accessibilityRole="button" hitSlop={8}>
          <Text style={s.manage}>{t('proto.manage')}</Text>
        </Pressable>
      </View>

      <View style={s.strip}>
        <Pressable onPress={() => page(-1)} style={s.pageBtn} accessibilityRole="button" accessibilityLabel={t('proto.prevWeek')}>
          <Text style={s.pageText}>‹</Text>
        </Pressable>
        {weekDays.map(day => {
          const views = weekViews.filter(v => v.date === day);
          const logged = views.filter(v => v.status === 'logged').length;
          const isSel = day === selected;
          const isToday = day === today;
          return (
            <Pressable
              key={day}
              onPress={() => setSelected(day)}
              style={[s.dayCell, isToday && s.dayToday, isSel && s.daySel]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSel }}
              accessibilityLabel={t('proto.dayA11y', {
                day: parseLocalDay(day).toLocaleDateString(dateLocale, { weekday: 'long', month: 'short', day: 'numeric' }),
                planned: views.length,
                logged,
              })}
            >
              <Text style={[s.dayName, isSel && s.daySelText]}>{weekdayName(weekdayOf(day), dateLocale, 'narrow')}</Text>
              <Text style={[s.dayNum, isSel && s.daySelText]}>{Number(day.slice(8, 10))}</Text>
              <View style={s.dotRow}>
                {views.slice(0, 4).map(v => (
                  <View key={v.key} style={[s.dot, dotStyle(v.status)]} />
                ))}
              </View>
            </Pressable>
          );
        })}
        <Pressable onPress={() => page(1)} style={s.pageBtn} accessibilityRole="button" accessibilityLabel={t('proto.nextWeek')}>
          <Text style={s.pageText}>›</Text>
        </Pressable>
      </View>

      {dayViews.length === 0 && extras.length === 0 && (
        <Text style={s.emptyText}>{t('proto.nothingPlanned')}</Text>
      )}
      {dayViews.map(view => (
        <PlannedDoseCard
          key={view.key}
          view={view}
          canAct={view.date <= today}
          onLog={() => onLog(toPlannedDose(view))}
          onSkip={() => skip(view)}
          onUnskip={() => unskip(view)}
          onOpen={() => view.record && onOpenRecord(view.record as Injection)}
        />
      ))}
      {extras.map(record => (
        <Pressable key={record.id} style={s.extraRow} onPress={() => onOpenRecord(record)} accessibilityRole="button">
          <Text style={s.extraText}>{t('proto.unplannedLog', { name: record.peptide, time: formatClockTime(record.time) })}</Text>
        </Pressable>
      ))}
    </Card>
  );
}

function dotStyle(status: OccurrenceView['status']) {
  switch (status) {
    case 'logged': return s.dotLogged;
    case 'skipped': return s.dotSkipped;
    default: return s.dotPlanned;
  }
}

export function PlannedDoseCard({ view, canAct, onLog, onSkip, onUnskip, onOpen }: {
  view: OccurrenceView;
  canAct: boolean;
  onLog: () => void;
  onSkip: () => void;
  onUnskip: () => void;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const time = formatClockTime(view.time);
  const status = view.status;
  const body = (
    <>
      <View style={{ flex: 1 }}>
        <Text style={s.cardTitle}>{view.compound}</Text>
        <Text style={s.cardMeta}>
          {view.amount} {view.unit} · {time}
          {status === 'logged' && view.record ? `  ·  ${t('proto.loggedAt', { time: formatClockTime(view.record.time) })}` : ''}
        </Text>
        {canAct && (status === 'planned' || status === 'notLogged') && (
          <View style={s.actions}>
            <Pressable style={s.logBtn} onPress={onLog} accessibilityRole="button" accessibilityLabel={t('proto.logA11y', { name: view.compound, time })}>
              <Text style={s.logBtnText}>{t('proto.log')}</Text>
            </Pressable>
            <Pressable style={s.skipBtn} onPress={onSkip} accessibilityRole="button">
              <Text style={s.skipBtnText}>{t('proto.skip')}</Text>
            </Pressable>
          </View>
        )}
        {status === 'skipped' && (
          <Pressable style={s.undoBtn} onPress={onUnskip} accessibilityRole="button">
            <Text style={s.skipBtnText}>{t('tools.undo')}</Text>
          </Pressable>
        )}
      </View>
      <View style={[s.pill, pillStyle(status)]}>
        <Text style={[s.pillText, pillTextStyle(status)]}>{t(`proto.status.${status}`)}</Text>
      </View>
    </>
  );
  // Only a logged card is tappable (opens the record). Wrapping the Log and
  // Skip buttons in a disabled Pressable would swallow their taps on web.
  return status === 'logged'
    ? <Pressable style={s.card} onPress={onOpen} accessibilityRole="button">{body}</Pressable>
    : <View style={s.card}>{body}</View>;
}

function pillStyle(status: OccurrenceView['status']) {
  return status === 'logged' ? s.pillLogged : status === 'skipped' ? s.pillSkipped : null;
}
function pillTextStyle(status: OccurrenceView['status']) {
  return status === 'logged' ? s.pillTextLogged : status === 'skipped' ? s.pillTextSkipped : status === 'notLogged' ? s.pillTextFaint : null;
}

const s = StyleSheet.create({
  headRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  manage: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, paddingVertical: 10 },
  setupBtn: { minHeight: 44, borderRadius: radius.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  setupBtnText: { color: colors.actionText, fontSize: 14, fontWeight: '700' },
  strip: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  pageBtn: { width: 22, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  pageText: { color: colors.primary, fontSize: 20, fontWeight: '700' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md, borderWidth: 1, borderColor: 'transparent', marginHorizontal: 1 },
  dayToday: { borderColor: colors.primary },
  daySel: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  dayName: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  dayNum: { color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 },
  daySelText: { color: colors.actionText },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotLogged: { backgroundColor: colors.teal },
  dotPlanned: { borderWidth: 1, borderColor: colors.textFaint },
  dotSkipped: { borderWidth: 1, borderColor: colors.accentLight },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: colors.borderFaint, paddingVertical: 12 },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  cardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  logBtn: { minHeight: 40, minWidth: 84, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  logBtnText: { color: colors.actionText, fontSize: 14, fontWeight: '700' },
  skipBtn: { minHeight: 40, paddingHorizontal: 12, justifyContent: 'center' },
  undoBtn: { minHeight: 36, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 4 },
  skipBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.bgPill },
  pillLogged: { backgroundColor: withAlpha(colors.teal, 0.16) },
  pillSkipped: { backgroundColor: withAlpha(colors.accentLight, 0.14) },
  pillText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  pillTextLogged: { color: colors.teal },
  pillTextSkipped: { color: colors.accentLight },
  pillTextFaint: { color: colors.textMuted },
  extraRow: { borderTopWidth: 1, borderTopColor: colors.borderFaint, paddingVertical: 10 },
  extraText: { color: colors.textMuted, fontSize: 13 },
});
