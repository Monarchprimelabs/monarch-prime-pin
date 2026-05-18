import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

import { DashboardScreen } from '../screens/DashboardScreen';
import { LogInjectionScreen } from '../screens/LogInjectionScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { AICoachScreen } from '../screens/AICoachScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type TabId = 'home' | 'log' | 'history' | 'ai' | 'analytics' | 'settings';

export function BottomTabs() {
  const [active, setActive] = React.useState<TabId>('home');

  return (
    <View style={s.app}>
      <View style={{ flex: 1 }}>
        {active === 'home' && <DashboardScreen onNavigate={(t) => setActive(t as TabId)} />}
        {active === 'log' && <LogInjectionScreen onDone={() => setActive('history')} />}
        {active === 'history' && <HistoryScreen />}
        {active === 'ai' && <AICoachScreen />}
        {active === 'analytics' && <AnalyticsScreen />}
        {active === 'settings' && <SettingsScreen />}
      </View>

      <SafeAreaView edges={['bottom']} style={s.tabBarSafe}>
        <View style={s.tabBar}>
          {([
            { id: 'home' as const, label: 'Home' },
            { id: 'log' as const, label: 'Log' },
            { id: 'history' as const, label: 'History' },
            { id: 'ai' as const, label: 'AI' },
            { id: 'analytics' as const, label: 'Analytics' },
            { id: 'settings' as const, label: 'Settings' },
          ]).map(t => (
            <Pressable
              key={t.id}
              onPress={() => setActive(t.id)}
              style={s.tab}
            >
              <TabIcon id={t.id} active={active === t.id} />
              <Text style={[s.tabLabel, active === t.id && s.tabLabelActive]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
    case 'ai':
      return (
        <Svg width="22" height="22" viewBox="0 0 24 24">
          <Path
            {...props}
            d="M12 2 a4 4 0 0 0 -4 4 v1 H7 a3 3 0 0 0 -3 3 v3 a3 3 0 0 0 3 3 h1 v1 a4 4 0 0 0 8 0 v-1 h1 a3 3 0 0 0 3 -3 v-3 a3 3 0 0 0 -3 -3 h-1 V6 a4 4 0 0 0 -4 -4 z"
          />
          <Circle cx="9" cy="11" r="0.8" fill={c} />
          <Circle cx="15" cy="11" r="0.8" fill={c} />
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
  tabBarSafe: {
    backgroundColor: 'rgba(8, 15, 28, 0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(30, 136, 229, 0.2)',
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
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textFaint,
  },
  tabLabelActive: {
    color: colors.primary,
  },
});
