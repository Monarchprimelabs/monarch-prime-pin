import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';

const KEY_THEME = '@mpp/theme';

export type ThemeMode = 'system' | 'dark' | 'light';

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: ColorSchemeName;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [mode, setStoredMode] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);
  const systemScheme = useColorScheme();
  const resolved = mode === 'system' ? systemScheme : mode;

  useEffect(() => {
    AsyncStorage.getItem(KEY_THEME).then(value => {
      const saved: ThemeMode = value === 'dark' || value === 'light' ? value : 'system';
      Appearance.setColorScheme(saved === 'system' ? null : saved);
      setStoredMode(saved);
      setReady(true);
    });
  }, []);

  const setMode = async (next: ThemeMode) => {
    Appearance.setColorScheme(next === 'system' ? null : next);
    setStoredMode(next);
    await AsyncStorage.setItem(KEY_THEME, next);
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode }}>
      <React.Fragment key={mode}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
}

export function useThemePreference() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  return value;
}
