import React from 'react';
import { View, Text, StyleSheet, AppState } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, withAlpha } from '../theme';

import { DashboardScreen } from '../screens/DashboardScreen';
import { LogInjectionScreen } from '../screens/LogInjectionScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { useI18n } from '../lib/i18n';
import { onProtocolReminderTap, syncProtocolReminders } from '../lib/protocolReminders';
import { adoptLegacyPhotos } from '../lib/storage';
import { FounderSheetHost } from '../components/FounderSheet';
import { AuroraBackground, GlassSurface, PressableScale } from '../components/Glass';
import { LapsedSheetHost } from '../components/LapsedSheet';
import { usePremium } from '../lib/usePremium';
import { setPremiumKnown } from '../lib/notify/store';
import { useFoldLayout } from '../lib/layout';
import { recordAppOpen } from '../lib/localMetrics';

export type TabId = 'home' | 'log' | 'history' | 'analytics' | 'settings';

export function BottomTabs() {
  const { t } = useI18n();
  const [active, setActive] = React.useState<TabId>('home');
  const [pendingOccurrence, setPendingOccurrence] = React.useState<string | null>(null);
  const { premium } = usePremium();

  // Notification syncs run outside React, so they read the last known
  // Premium state (monthly report, weekly summary wording).
  React.useEffect(() => {
    setPremiumKnown(premium).then(() => syncProtocolReminders()).catch(() => undefined);
  }, [premium]);

  // Protocol reminders are a rolling window: rebuild it whenever the app
  // comes forward, which also re-anchors them after a time zone change.
  React.useEffect(() => {
    syncProtocolReminders().catch(() => undefined);
    adoptLegacyPhotos().catch(() => undefined);
    recordAppOpen().catch(() => undefined);
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      syncProtocolReminders().catch(() => undefined);
      recordAppOpen().catch(() => undefined);
    });
    const stopTaps = onProtocolReminderTap(key => {
      setActive('home');
      setPendingOccurrence(key);
    });
    return () => { sub.remove(); stopTaps(); };
  }, []);

  return (
    <View style={s.app}>
      <AuroraBackground />
      <ScreenFade key={active}>
        {active === 'home' && (
          <DashboardScreen
            onNavigate={(t) => setActive(t as TabId)}
            pendingOccurrenceKey={pendingOccurrence}
            onPendingHandled={() => setPendingOccurrence(null)}
          />
        )}
        {active === 'log' && <LogInjectionScreen onDone={() => setActive('history')} />}
        {active === 'history' && <HistoryScreen />}
        {active === 'analytics' && <AnalyticsScreen />}
        {active === 'settings' && <ToolsScreen />}
      </ScreenFade>

      <GlassTabBar active={active} onSelect={setActive} />
      <FounderSheetHost />
      <LapsedSheetHost />
    </View>
  );
}

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'home', labelKey: 'tab.home' },
  { id: 'history', labelKey: 'tab.history' },
  { id: 'log', labelKey: 'tab.log' },
  { id: 'analytics', labelKey: 'tab.reports' },
  { id: 'settings', labelKey: 'tab.tools' },
];

/** Each tab's screen eases in when it becomes active. */
function ScreenFade({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 1 : 0);
  React.useEffect(() => {
    if (!reduce) p.value = withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({ flex: 1, opacity: p.value, transform: [{ translateY: (1 - p.value) * 12 }] }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

/**
 * A floating capsule of glass. A lit pill slides to the selected tab on a
 * spring; the log button sits in the middle, raised and glowing.
 */
function GlassTabBar({ active, onSelect }: { active: TabId; onSelect: (tab: TabId) => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  // On the open Duo the bar sits in the left half, clear of the fold.
  const fold = useFoldLayout();
  const [width, setWidth] = React.useState(0);
  const index = TABS.findIndex(tab => tab.id === active);
  const x = useSharedValue(0);
  const shown = useSharedValue(active === 'log' ? 0 : 1);
  const slot = width / TABS.length;
  React.useEffect(() => {
    if (!width) return;
    const target = index * slot;
    x.value = reduce ? target : withSpring(target, { damping: 18, stiffness: 190, mass: 0.8 });
    shown.value = withTiming(active === 'log' ? 0 : 1, { duration: 180 });
  }, [index, slot, width, reduce, active, x, shown]);
  const pill = useAnimatedStyle(() => ({ width: slot, opacity: shown.value, transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={[s.barHost, fold && s.barHostFold, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <GlassSurface style={s.bar} intensity={55}>
        <View style={s.barRow} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && <Animated.View style={[s.pillTrack, pill]} pointerEvents="none"><View style={s.pill} /></Animated.View>}
          {TABS.map(tab => tab.id === 'log' ? (
            <View key="log" style={s.tab}>
              <PressableScale
                onPress={() => onSelect('log')}
                scaleTo={0.9}
                style={s.fab}
                accessibilityRole="button"
                accessibilityLabel={t('tab.log')}
                accessibilityState={{ selected: active === 'log' }}
              >
                <LinearGradient colors={[colors.accentLight, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.fabFill}>
                  <Ionicons name="add" size={30} color={colors.actionText} />
                </LinearGradient>
              </PressableScale>
            </View>
          ) : (
            <PressableScale
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              style={s.tab}
              scaleTo={0.88}
              accessibilityRole="tab"
              accessibilityState={{ selected: active === tab.id }}
              accessibilityLabel={t(tab.labelKey)}
            >
              <TabIcon id={tab.id} active={active === tab.id} />
              <Text style={[s.tabLabel, active === tab.id && s.tabLabelActive]} numberOfLines={1}>{t(tab.labelKey)}</Text>
            </PressableScale>
          ))}
        </View>
      </GlassSurface>
    </View>
  );
}

function TabIcon({ id, active }: { id: TabId; active: boolean }) {
  const c = active ? colors.primary : colors.textFaint;
  const props = {
    fill: 'none',
    stroke: c,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (id) {
    case 'home':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Path {...props} d="M3 12 L12 3 L21 12" />
          <Path {...props} d="M5 10 V20 H19 V10" />
        </Svg>
      );
    case 'log':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Path {...props} d="M12 5 V19 M5 12 H19" />
        </Svg>
      );
    case 'history':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Circle {...props} cx="12" cy="12" r="9" />
          <Path {...props} d="M12 7 V12 L15 14" />
        </Svg>
      );
    case 'analytics':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Path {...props} d="M4 20 V10 M10 20 V4 M16 20 V14 M22 20 H2" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Circle {...props} cx="12" cy="12" r="3" />
          <Path
            {...props}
            d="M12 1 V5 M12 19 V23 M4.2 4.2 L7 7 M17 17 L19.8 19.8 M1 12 H5 M19 12 H23 M4.2 19.8 L7 17 M17 7 L19.8 4.2"
          />
        </Svg>
      );
  }
}

const s = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  // Floating glass capsule; content scrolls underneath it.
  barHost: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: 14 },
  barHostFold: { right: '50%', paddingRight: 28 },
  bar: {
    width: '100%', maxWidth: 520, height: 66, borderRadius: 33,
    shadowColor: '#000', shadowOffset: { width: 0, height: 14 }, shadowOpacity: colors.cardShadow, shadowRadius: 28, elevation: 10,
  },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 },
  pillTrack: { position: 'absolute', top: 0, bottom: 0, left: 0, padding: 7, paddingHorizontal: 5 },
  pill: {
    flex: 1, borderRadius: 26,
    backgroundColor: withAlpha(colors.primary, 0.2),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.primary, 0.45),
  },
  tab: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 14, elevation: 8,
  },
  fabFill: {
    flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  tabLabel: { fontSize: 10, fontWeight: '600', color: colors.textFaint },
  tabLabelActive: { color: colors.primary, fontWeight: '700' },
});
