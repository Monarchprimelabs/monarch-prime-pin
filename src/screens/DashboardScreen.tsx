import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Alert, View, Text, ScrollView, StyleSheet, Pressable, Modal, PanResponder } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Disclaimer, Header, Card, CardLabel, ViewPill, BrandMark } from '../components/UI';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { BodyDiagram } from '../components/BodyDiagram';
import { colors, spacing, radius, severity, heatColors, withAlpha } from '../theme';
import { useAuth } from '../lib/auth';
import { getInjections, getSchedules, ScheduleEntry } from '../lib/storage';
import { Injection } from '../data/peptides';
import { getInjectionSiteIds } from '../lib/sites';
import { buildHeatEntries, bandsByZone, getHeatHalfLife, DEFAULT_HALF_LIFE_DAYS, HEAT_BAND_ORDER, HeatBand } from '../lib/heat';
import { useI18n } from '../lib/i18n';
import { FREE_INJECTION_LIMIT, LIFETIME_PRO_PRICE_LABEL, useEntitlements } from '../lib/entitlements';
import { LogInjectionScreen } from './LogInjectionScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEY_LAST_BACKUP_AT } from '../lib/backup';
import { localDateISO, parseLocalDay } from '../lib/dates';
import { updateWidgetSnapshot } from '../lib/widget';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  onNavigate: (tab: string) => void;
};

function displayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [year, month, day] = iso.split('-');
  return `${month}-${day}-${year}`;
}

function getGreetingName(fallback: string, name?: string, email?: string) {
  const cleaned = name?.trim().replace(/\s+/g, ' ') || '';
  const emailPrefix = email?.split('@')[0]?.toLowerCase();
  if (!cleaned || cleaned.includes('@') || cleaned.toLowerCase() === emailPrefix) {
    return fallback;
  }
  return cleaned.split(' ')[0];
}

export function DashboardScreen({ onNavigate }: Props) {
  const { user } = useAuth();
  const { hasPro, monetizationEnabled } = useEntitlements();
  const { t, dateLocale } = useI18n();
  const [view, setView] = useState<'front' | 'back'>('front');
  const [injections, setInjections] = useState<Injection[]>([]);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const shareCardRef = useRef<View>(null);

  const [lastBackupAt, setLastBackupAt] = useState<string | null | undefined>(undefined);
  const [halfLife, setHalfLife] = useState(DEFAULT_HALF_LIFE_DAYS);
  const [heatWindow, setHeatWindow] = useState<number | undefined>(undefined); // days; undefined = All
  const [scrubDaysAgo, setScrubDaysAgo] = useState(0);

  const refresh = () => {
    getHeatHalfLife().then(setHalfLife);
    getInjections().then(records => {
      setInjections(records);
      updateWidgetSnapshot(records, t);
    });
    getSchedules().then(setSchedules);
    AsyncStorage.getItem(KEY_LAST_BACKUP_AT).then(setLastBackupAt).catch(() => setLastBackupAt(null));
  };
  useEffect(() => { refresh(); }, []);

  // Gentle backup nudge once there is meaningful data and the last export
  // is missing or older than 30 days. undefined = still loading, no nudge.
  const backupDaysAgo = lastBackupAt
    ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const showBackupNudge = lastBackupAt !== undefined
    && injections.length >= 5
    && (lastBackupAt === null || (backupDaysAgo !== null && backupDaysAgo > 30));

  const stats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = injections.filter(i => parseLocalDay(i.date) >= weekAgo).length;

    const logDays = new Set(injections.map(i => i.date).filter(Boolean));
    let streak = 0;
    const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    while (logDays.has(localDateISO(cursor))) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    // Longest run of consecutive logged days across all history.
    const sortedDays = [...logDays].sort();
    let longestStreak = 0;
    let run = 0;
    let previousDay: string | null = null;
    sortedDays.forEach(day => {
      if (previousDay) {
        const next = parseLocalDay(previousDay);
        next.setDate(next.getDate() + 1);
        run = localDateISO(next) === day ? run + 1 : 1;
      } else {
        run = 1;
      }
      longestStreak = Math.max(longestStreak, run);
      previousDay = day;
    });

    const monthPrefix = localDateISO().slice(0, 7);
    const monthCount = injections.filter(i => i.date.startsWith(monthPrefix)).length;
    const zonesUsed = new Set(injections.flatMap(i => getInjectionSiteIds(i))).size;

    return {
      streak,
      longestStreak,
      total: injections.length,
      thisWeek,
      monthCount,
      zonesUsed,
    };
  }, [injections]);

  const RECORD_MILESTONES = [500, 250, 100, 50, 25, 10];
  const recordMilestone = RECORD_MILESTONES.find(m => stats.total >= m);

  // Latest by logged date+time (times are zero-padded, so string compare is
  // safe) — insertion order lies when the user backfills an older date.
  const lastInj = useMemo(() => [...injections].sort(
    (a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`),
  )[0], [injections]);
  const greetingName = getGreetingName(t('dash.researcher'), user?.name, user?.email);
  const lastInjSiteIds = lastInj ? getInjectionSiteIds(lastInj) : [];
  const lastInjSites = lastInjSiteIds.length ? lastInjSiteIds.map(id => t('zone.' + id)).join(', ') : lastInj?.site ?? '';
  const heatEntries = useMemo(() => buildHeatEntries(injections), [injections]);
  // Heat depends on the calendar day, not the render — dayKey keeps the memo
  // stable within a day and rolls it over at local midnight.
  const dayKey = new Date().toDateString();
  const siteBands = useMemo(() => {
    const nowMs = Date.now() - scrubDaysAgo * 86400000;
    return bandsByZone(heatEntries, nowMs, halfLife, heatWindow);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heatEntries, halfLife, heatWindow, scrubDaysAgo, dayKey]);
  const scrubDate = useMemo(() => {
    const d = new Date(Date.now() - scrubDaysAgo * 86400000);
    return d.toLocaleDateString(dateLocale);
  }, [scrubDaysAgo, dayKey, dateLocale]);
  const nextSchedule = useMemo(() => schedules
    .filter(item => !item.completedAt && new Date(`${item.date}T${item.time}:00`).getTime() >= Date.now())
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0], [schedules]);
  const completedScheduleCount = schedules.filter(item => item.completedAt).length;
  const canUsePro = hasPro || !!user?.isDeveloper;
  const freeTrialActive = monetizationEnabled && !canUsePro;
  const freeLogsRemaining = Math.max(0, FREE_INJECTION_LIMIT - stats.total);

  return (
    <SafeAreaView style={s.app} edges={['top']}>
      <Disclaimer />
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <Header
          title={t('dash.hello', { name: greetingName })}
          subtitle={user?.isDeveloper ? t('dash.devMode') : t('dash.welcome')}
        />

        <View style={s.statRow}>
          <StatCard icon="flame-outline" color={colors.accent} value={stats.streak} label={t('dash.dayStreak')} />
          <StatCard icon="eyedrop-outline" color={colors.primary} value={stats.total} label={t('dash.totalInj')} />
          <StatCard icon="calendar-outline" color={colors.teal} value={stats.thisWeek} label={t('dash.thisWeek')} />
        </View>

        {(stats.longestStreak > 1 || !!recordMilestone) && (
          <Text style={s.milestoneLine}>
            {stats.longestStreak > 1 ? t('dash.longestStreak', { n: stats.longestStreak }) : ''}
            {stats.longestStreak > 1 && recordMilestone ? '  ·  ' : ''}
            {recordMilestone ? t('dash.milestone', { n: recordMilestone }) : ''}
          </Text>
        )}

        {freeTrialActive && (
          <Pressable style={s.unlockCard} onPress={() => onNavigate('analytics')}>
            <View style={{ flex: 1 }}>
              <Text style={s.unlockEyebrow}>{t('log.freeTrialLabel')}</Text>
              <Text style={s.unlockTitle}>
                {freeLogsRemaining > 0
                  ? (freeLogsRemaining === 1 ? t('dash.freeLogsLeftOne') : t('dash.freeLogsLeftMany', { n: freeLogsRemaining }))
                  : t('dash.unlockNeeded')}
              </Text>
              <Text style={s.unlockBody}>
                {t('dash.unlockBody', { max: FREE_INJECTION_LIMIT, price: LIFETIME_PRO_PRICE_LABEL })}
              </Text>
            </View>
            <Text style={s.unlockChev}>›</Text>
          </Pressable>
        )}

        {!reminderDismissed && lastInj && (
          <View style={s.reminderCard}>
            <Pressable onPress={() => setReminderDismissed(true)} style={s.reminderClose}>
              <Text style={s.reminderCloseText}>×</Text>
            </Pressable>
            <View style={s.reminderHeader}>
              <Text style={{ fontSize: 14 }}>⏰</Text>
              <Text style={s.reminderTitle}>{t('dash.logReview')}</Text>
            </View>
            <Text style={s.reminderCompound}>{lastInj.peptide}</Text>
            <Text style={s.reminderMeta}>{t('dash.lastLogged', { date: lastInj.date })}</Text>
            <Text style={s.reminderMeta}>{t('dash.lastSite', { site: lastInjSites })}</Text>
            <View style={s.reminderNext}>
              <Text style={s.reminderNextText}>{t('dash.reviewPrev')}</Text>
            </View>
          </View>
        )}

        {canUsePro && nextSchedule && (
          <Pressable style={s.scheduleCard} onPress={() => onNavigate('settings')}>
            <View style={{ flex: 1 }}>
              <Text style={s.scheduleEyebrow}>{t('dash.nextScheduled')}</Text>
              <Text style={s.scheduleTitle}>{nextSchedule.title}</Text>
              <Text style={s.scheduleMeta}>{displayDate(nextSchedule.date)} · {nextSchedule.time}</Text>
            </View>
            <View style={s.scheduleDone}>
              <Text style={s.scheduleDoneValue}>{completedScheduleCount}</Text>
              <Text style={s.scheduleDoneLabel}>{t('dash.done')}</Text>
            </View>
          </Pressable>
        )}

        {showBackupNudge && (
          <Pressable style={s.backupNudge} onPress={() => onNavigate('settings')}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.teal} />
            <Text style={s.backupNudgeText}>
              {lastBackupAt === null
                ? t('dash.backupNever')
                : t('dash.backupOld', { n: backupDaysAgo ?? 0 })}
            </Text>
            <Text style={s.unlockChev}>›</Text>
          </Pressable>
        )}

        <Card>
          <CardLabel icon="📍">{t('dash.siteHeatmap')}</CardLabel>
          <ViewPill view={view} setView={setView} />
          <View style={s.windowRow}>
            {([
              { days: 7, label: t('dash.window7') },
              { days: 30, label: t('dash.window30') },
              { days: 90, label: t('dash.window90') },
              { days: undefined, label: t('dash.windowAll') },
            ] as { days?: number; label: string }[]).map(option => (
              <Pressable
                key={option.label}
                onPress={() => setHeatWindow(option.days)}
                style={[s.windowBtn, heatWindow === option.days && s.windowBtnActive]}
              >
                <Text style={[s.windowBtnText, heatWindow === option.days && s.windowBtnTextActive]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <BodyDiagram view={view} mode="heatmap" bandsByZone={siteBands} />
          <Text style={s.anteriorLabel}>{view === 'front' ? t('log.anterior') : t('log.posterior')}</Text>
          <View style={s.legend}>
            {HEAT_BAND_ORDER.map(band => (
              <LegendDot key={band} color={heatColors[band].dot} label={t('dash.band.' + band)} />
            ))}
          </View>
          <Text style={s.legendCaption}>{t('dash.legendCaption')}</Text>
          <ScrubBar daysAgo={scrubDaysAgo} maxDays={90} onChange={setScrubDaysAgo} />
          <Text style={s.scrubLabel}>
            {scrubDaysAgo === 0
              ? t('dash.scrubToday')
              : t('dash.scrubDaysAgo', { n: scrubDaysAgo, date: scrubDate })}
          </Text>
        </Card>

        {lastInj && (
          <Card>
            <CardLabel icon="💉">{t('dash.lastInjection')}</CardLabel>
            <Text style={s.lastInjPeptide}>{lastInj.peptide}</Text>
            <Text style={s.lastInjMeta}>
              {lastInj.dose}{lastInj.unit}  ·  {lastInj.date}  ·{' '}
              <Text style={{ color: severity[lastInj.sev] }}>
                {t('sev.' + lastInj.sev)}
              </Text>
            </Text>
            <Text style={s.lastInjMeta}>{t('dash.sites', { site: lastInjSites })}</Text>
            <Pressable style={s.repeatBtn} onPress={() => setRepeatOpen(true)}>
              <Text style={s.repeatBtnText}>{t('dash.logAgain')}</Text>
            </Pressable>
          </Card>
        )}

        <View style={s.qaRow}>
          <Pressable style={s.qaPrimary} onPress={() => onNavigate('log')}>
            <Ionicons name="add-circle-outline" size={19} color={colors.actionText} />
            <Text style={s.qaPrimaryText}>{t('log.titleNew')}</Text>
          </Pressable>
        </View>

        {stats.total > 0 && (
          <Pressable style={s.shareRow} onPress={() => setShareOpen(true)}>
            <Ionicons name="share-outline" size={17} color={colors.primary} />
            <Text style={s.shareRowText}>{t('dash.shareBtn')}</Text>
            <Text style={s.unlockChev}>›</Text>
          </Pressable>
        )}
      </ScrollView>

      <Modal visible={repeatOpen} animationType="slide" onRequestClose={() => setRepeatOpen(false)}>
        {lastInj && (
          <LogInjectionScreen
            prefillFrom={lastInj}
            onDone={() => { setRepeatOpen(false); refresh(); }}
            onCancel={() => setRepeatOpen(false)}
          />
        )}
      </Modal>

      <Modal visible={shareOpen} animationType="fade" transparent onRequestClose={() => setShareOpen(false)}>
        <View style={s.shareBackdrop}>
          <View ref={shareCardRef} collapsable={false} style={s.shareCard}>
            <View style={s.shareHeader}>
              <BrandMark />
              <View>
                <Text style={s.shareBrand}>MONARCH PRIME PIN</Text>
                <Text style={s.shareTitle}>{t('share.title')}</Text>
              </View>
            </View>
            <Text style={s.shareBig}>{stats.total}</Text>
            <Text style={s.shareBigLabel}>{t('share.records')}</Text>
            <View style={s.shareGrid}>
              <ShareStat label={t('share.streak')} value={t('share.days', { n: stats.streak })} />
              <ShareStat label={t('share.longest')} value={t('share.days', { n: stats.longestStreak })} />
              <ShareStat label={t('share.month')} value={String(stats.monthCount)} />
              <ShareStat label={t('share.zones')} value={String(stats.zonesUsed)} />
            </View>
            <Text style={s.shareFooter}>{t('share.footer')}</Text>
            <Text style={s.shareCompliance}>{t('share.compliance')}</Text>
          </View>
          <View style={s.shareActions}>
            <Pressable style={s.shareCloseBtn} onPress={() => setShareOpen(false)}>
              <Text style={s.shareCloseText}>{t('share.close')}</Text>
            </Pressable>
            <Pressable
              style={s.shareGoBtn}
              onPress={async () => {
                try {
                  const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri, { mimeType: 'image/png' });
                  } else {
                    Alert.alert(t('share.failed'));
                  }
                } catch {
                  // Capture/share is best-effort; the card stays on screen.
                }
              }}
            >
              <Ionicons name="share-outline" size={17} color={colors.actionText} />
              <Text style={s.shareGoText}>{t('share.action')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Counts from the previous value (0 on first mount) to the target with an
// ease-out curve. Pure JS/rAF — no native driver needed for text.
function useCountUp(target: number, duration = 600): number {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) { setDisplay(target); return; }
    const start = Date.now();
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return display;
}

function StatCard({ icon, color, value, label }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; value: number; label: string;
}) {
  const displayValue = useCountUp(value);
  return (
    <View style={s.statCard}>
      <Ionicons name={icon} size={20} color={color} style={s.statIcon} />
      <Text style={s.statVal}>{displayValue}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// Dependency-free history scrub: drag to move "now" back up to maxDays.
// Left edge = maxDays ago, right edge = today. Values quantize to whole days
// so heat memos only recompute when the day under the thumb changes.
function ScrubBar({ daysAgo, maxDays, onChange }: { daysAgo: number; maxDays: number; onChange: (days: number) => void }) {
  const widthRef = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const handleX = (x: number) => {
    const width = widthRef.current;
    if (width <= 0) return;
    const fraction = Math.max(0, Math.min(1, x / width));
    onChangeRef.current(Math.round((1 - fraction) * maxDays));
  };

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: evt => handleX(evt.nativeEvent.locationX),
      onPanResponderMove: evt => handleX(evt.nativeEvent.locationX),
    }),
  ).current;

  const fraction = 1 - daysAgo / maxDays;
  return (
    <View
      style={s.scrubTrackWrap}
      onLayout={event => { widthRef.current = event.nativeEvent.layout.width; }}
      {...responder.panHandlers}
    >
      <View style={s.scrubTrack}>
        <View style={[s.scrubFill, { width: `${fraction * 100}%` }]} />
      </View>
      <View style={[s.scrubThumb, { left: `${fraction * 100}%` }]} />
    </View>
  );
}

function ShareStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.shareStat}>
      <Text style={s.shareStatValue}>{value}</Text>
      <Text style={s.shareStatLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={s.legendItem}>
      <View style={[s.legendDot, { backgroundColor: color }]} />
      <Text style={s.legendText}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  statRow: {
    flexDirection: 'row', gap: 10, paddingHorizontal: spacing.xl, marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statIcon: { marginBottom: 4 },
  milestoneLine: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: -6, marginBottom: 14 },
  backupNudge: {
    marginHorizontal: spacing.xl, marginBottom: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(20,184,166,0.06)', borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.25)', borderRadius: radius.lg,
  },
  backupNudgeText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  statVal: { color: colors.white, fontSize: 22, fontWeight: '700' },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  reminderCard: {
    marginHorizontal: spacing.xl, marginBottom: 14,
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
    borderWidth: 1, borderColor: 'rgba(255, 140, 0, 0.3)',
    borderRadius: radius.lg, padding: 16, paddingTop: 14,
  },
  reminderClose: { position: 'absolute', right: 12, top: 10, zIndex: 2 },
  reminderCloseText: { color: colors.textMuted, fontSize: 24, lineHeight: 24 },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  reminderTitle: { color: colors.accent, fontSize: 13, fontWeight: '700', letterSpacing: 1.2 },
  reminderCompound: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 4 },
  reminderMeta: { color: colors.text, fontSize: 13, marginBottom: 2 },
  reminderNext: {
    marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
  },
  reminderNextText: { color: colors.textMuted, fontSize: 13 },
  scheduleCard: {
    marginHorizontal: spacing.xl, marginBottom: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(20,184,166,0.08)', borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)', borderRadius: radius.lg,
  },
  scheduleEyebrow: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 5 },
  scheduleTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  scheduleMeta: { color: colors.textMuted, fontSize: 12 },
  scheduleDone: { minWidth: 50, alignItems: 'center' },
  scheduleDoneValue: { color: colors.teal, fontSize: 20, fontWeight: '700' },
  scheduleDoneLabel: { color: colors.textMuted, fontSize: 10 },
  unlockCard: {
    marginHorizontal: spacing.xl, marginBottom: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(20,184,166,0.08)', borderWidth: 1,
    borderColor: 'rgba(20,184,166,0.3)', borderRadius: radius.lg,
  },
  unlockEyebrow: { color: colors.teal, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginBottom: 5 },
  unlockTitle: { color: colors.white, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  unlockBody: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  unlockChev: { color: colors.teal, fontSize: 24, fontWeight: '700' },

  anteriorLabel: { textAlign: 'center', color: colors.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 3, marginTop: 8 },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 16 },
  legendCaption: { textAlign: 'center', color: colors.textFaint, fontSize: 10, lineHeight: 14, marginTop: 8 },

  shareRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.xl, marginBottom: spacing.lg,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderTopColor: 'rgba(255, 255, 255, 0.08)', borderRadius: radius.lg,
  },
  shareRowText: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  shareBackdrop: {
    flex: 1, backgroundColor: 'rgba(2, 6, 14, 0.92)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  shareCard: {
    width: 320, backgroundColor: colors.bg,
    borderWidth: 1, borderColor: colors.borderOrange,
    borderRadius: 18, padding: 24, alignItems: 'center',
  },
  shareHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'flex-start', marginBottom: 18 },
  shareBrand: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 1.6 },
  shareTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  shareBig: { color: colors.white, fontSize: 56, fontWeight: '800', letterSpacing: -1.5 },
  shareBigLabel: { color: colors.textMuted, fontSize: 13, marginTop: -4, marginBottom: 18 },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  shareStat: {
    width: 130, paddingVertical: 12, alignItems: 'center',
    backgroundColor: colors.bgCard, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
  },
  shareStatValue: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  shareStatLabel: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  shareFooter: { color: colors.text, fontSize: 11, fontWeight: '600', marginTop: 18 },
  shareCompliance: { color: colors.textFaint, fontSize: 9, letterSpacing: 0.8, marginTop: 4 },
  shareActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  shareCloseBtn: {
    minHeight: 48, paddingHorizontal: 22, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  shareCloseText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  shareGoBtn: {
    minHeight: 48, paddingHorizontal: 28, borderRadius: radius.md,
    backgroundColor: colors.action, flexDirection: 'row', gap: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  shareGoText: { color: colors.actionText, fontSize: 14, fontWeight: '700' },
  windowRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 10 },
  windowBtn: {
    minHeight: 30, paddingHorizontal: 13, borderRadius: 15,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgPill,
    alignItems: 'center', justifyContent: 'center',
  },
  windowBtnActive: { backgroundColor: withAlpha(colors.primary, 0.25), borderColor: colors.primary },
  windowBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  windowBtnTextActive: { color: colors.white },
  scrubTrackWrap: { marginTop: 14, paddingVertical: 10, justifyContent: 'center' },
  scrubTrack: {
    height: 4, borderRadius: 2, backgroundColor: withAlpha(colors.primary, 0.15),
    overflow: 'hidden',
  },
  scrubFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  scrubThumb: {
    position: 'absolute', top: 3, width: 18, height: 18, marginLeft: -9,
    borderRadius: 9, backgroundColor: colors.white,
    borderWidth: 2, borderColor: colors.primary,
  },
  scrubLabel: { textAlign: 'center', color: colors.textMuted, fontSize: 11, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: colors.textMuted, fontSize: 11 },

  lastInjPeptide: { color: colors.white, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  lastInjMeta: { color: colors.text, fontSize: 13, lineHeight: 20 },
  repeatBtn: {
    minHeight: 44, marginTop: 12, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
  },
  repeatBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },

  qaRow: { paddingHorizontal: spacing.xl, marginTop: 2, marginBottom: 14 },
  qaPrimary: {
    backgroundColor: colors.action, borderRadius: radius.md,
    paddingVertical: 15, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8,
  },
  qaPrimaryText: { color: colors.actionText, fontSize: 15, fontWeight: '700' },
});
