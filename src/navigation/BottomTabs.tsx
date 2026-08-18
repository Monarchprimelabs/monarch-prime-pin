import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, withAlpha } from '../theme';

import { DashboardScreen } from '../screens/DashboardScreen';
import { LogInjectionScreen } from '../screens/LogInjectionScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { ToolsScreen } from '../screens/ToolsScreen';
import { UpgradeScreen } from '../screens/UpgradeScreen';
import { useEntitlements } from '../lib/entitlements';
import { useAuth } from '../lib/auth';
import { useI18n } from '../lib/i18n';

export type TabId = 'home' | 'log' | 'history' | 'analytics' | 'settings';

export function BottomTabs() {
  const { t } = useI18n();
  const [active, setActive] = React.useState<TabId>('home');

  // Tapping the home-screen widget opens monarchpin://log. The listener
  // lives inside the tab host, so the app lock gate (rendered above us)
  // still runs first — a deep link never bypasses it.
  React.useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (url && url.startsWith('monarchpin://log')) setActive('log');
    };
    Linking.getInitialURL().then(handleUrl).catch(() => undefined);
    const sub = Linking.addEventListener('url', event => handleUrl(event.url));
    return () => sub.remove();
  }, []);
  const { hasPro } = useEntitlements();
  const { user } = useAuth();
  const canUsePro = hasPro || !!user?.isDeveloper;

  return (
    <View style={s.app}>
      <View style={{ flex: 1 }}>
        {active === 'home' && <DashboardScreen onNavigate={(t) => setActive(t as TabId)} />}
        {active === 'log' && <LogInjectionScreen onDone={() => setActive('history')} />}
        {active === 'history' && <HistoryScreen />}
        {active === 'analytics' && (canUsePro ? <AnalyticsScreen /> : <UpgradeScreen />)}
        {active === 'settings' && <ToolsScreen />}
      </View>

      <View style={s.tabBarWrap}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={48} tint={colors.statusBar === 'light' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        )}
        <SafeAreaView edges={['bottom']} style={s.tabBarSafe}>
        <View style={s.tabBar}>
          {([
            { id: 'home' as const, labelKey: 'tab.home' },
            { id: 'history' as const, labelKey: 'tab.history' },
            { id: 'spacer' as const, labelKey: '' },
            { id: 'analytics' as const, labelKey: 'tab.reports' },
            { id: 'settings' as const, labelKey: 'tab.tools' },
          ]).map(tab => (
            tab.id === 'spacer' ? (
              // Leaves room for the raised log button, which is rendered
              // outside this clipped container.
              <View key="spacer" style={s.tab} pointerEvents="none" />
            ) : (
              <Pressable
                key={tab.id}
                onPress={() => setActive(tab.id)}
                style={({ pressed }) => [s.tab, pressed && s.tabPressed]}
              >
                <View style={[s.tabIconWrap, active === tab.id && s.tabIconWrapActive]}>
                  <TabIcon id={tab.id} active={active === tab.id} />
                </View>
                <Text style={[s.tabLabel, active === tab.id && s.tabLabelActive]}>
                  {t(tab.labelKey)}
                </Text>
              </Pressable>
            )
          ))}
        </View>
        </SafeAreaView>
      </View>

      {/* Raised log button. Rendered as a sibling of the bar because the bar
          clips its own blur (overflow: hidden) and would cut the top off. */}
      <SafeAreaView edges={['bottom']} style={s.fabHost} pointerEvents="box-none">
        <Pressable
          onPress={() => setActive('log')}
          style={({ pressed }) => [s.fab, pressed && s.fabPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('tab.log')}
          accessibilityState={{ selected: active === 'log' }}
        >
          <Ionicons name="add" size={32} color={colors.actionText} />
        </Pressable>
      </SafeAreaView>
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
  // Floating bar: content scrolls underneath, blur shows through on iOS.
  // Android gets a solid sheet (no cheap live blur there).
  tabBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: withAlpha(colors.primary, 0.2),
    backgroundColor: Platform.OS === 'ios' ? colors.bgTabBar : colors.bgSheet,
  },
  tabBarSafe: {
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  tabPressed: {
    transform: [{ scale: 0.9 }],
    opacity: 0.7,
  },
  fabHost: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'flex-end',
  },
  fab: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
    // Lifts the button above the bar without clipping, and keeps a ring of
    // the bar's own surface around it so it reads as seated, not floating.
    marginBottom: 18,
    borderWidth: 4, borderColor: colors.bg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
  fabPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
  tabIconWrap: {
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tabIconWrapActive: {
    backgroundColor: withAlpha(colors.primary, 0.16),
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
