import AsyncStorage from '@react-native-async-storage/async-storage';

/** Convert '#RRGGBB' to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export type ColorwayId = 'monarch' | 'jade' | 'royal';

// Colorways swap the app's primary hue (buttons, borders, active states).
// The orange research accent, all neutrals, and every data-semantic color
// (severity, heatmap bands) stay fixed in every colorway.
export const COLORWAYS: Record<ColorwayId, { label: string; primary: string; primaryDark: string }> = {
  monarch: { label: 'Monarch', primary: '#1E88E5', primaryDark: '#1565C0' },
  jade:    { label: 'Jade',    primary: '#10B981', primaryDark: '#047857' },
  royal:   { label: 'Royal',   primary: '#8B5CF6', primaryDark: '#6D28D9' },
};

export const KEY_COLORWAY = '@mpp/colorway';

export const colors = {
  bg: '#050810',
  bgCard: 'rgba(15, 25, 45, 0.4)',
  bgInput: 'rgba(10, 20, 38, 0.5)',
  bgPill: 'rgba(10, 20, 38, 0.6)',
  bgSheet: '#0a1019',

  border: 'rgba(30, 136, 229, 0.25)',
  borderSubtle: 'rgba(30, 136, 229, 0.15)',
  borderFaint: 'rgba(30, 136, 229, 0.08)',
  borderOrange: 'rgba(255, 140, 0, 0.25)',

  text: '#E8EEF7',
  textMuted: '#7B8FAB',
  textFaint: '#5A6B85',
  textDim: '#3A4A66',
  white: '#FFFFFF',

  primary: '#1E88E5',
  primaryDark: '#1565C0',
  action: '#1E88E5',
  actionText: '#FFFFFF',
  accent: '#FF8C00',
  accentLight: '#FFB066',
  gold: '#FFD700',
  teal: '#14b8a6',
  red: '#E53935',

  disclaimerBg1: '#2a1a08',
  disclaimerBg2: '#1a1004',
};

// Data-semantic: severity colors never follow the colorway.
export const severity = {
  none: colors.teal,
  mild: '#1E88E5',
  mod: colors.accent,
  sev: colors.red,
};

// Heatmap band colors — clear = rested (neutral outline), then a cool→hot
// ramp. Band meaning is logging cadence, decided in src/lib/heatMath.js.
// Data-semantic: fixed hues in every colorway so band colors stay readable.
export const heatColors = {
  clear:  { ring: 'rgba(122, 143, 173, 0.55)', dot: 'rgba(122, 143, 173, 0.4)' },
  blue:   { ring: '#1E88E5', dot: '#1E88E5' },
  green:  { ring: '#34D399', dot: '#34D399' },
  yellow: { ring: '#FACC15', dot: '#FACC15' },
  orange: { ring: colors.accent, dot: colors.accent },
  red:    { ring: colors.red, dot: colors.red },
};

// Must run BEFORE screen modules are evaluated — StyleSheets capture these
// values at import time. App.tsx guarantees that by require()ing the app
// tree only after loadColorway() resolves. Changing the colorway at runtime
// therefore takes effect on the next app launch.
export function applyColorway(id: ColorwayId): void {
  const palette = COLORWAYS[id] ?? COLORWAYS.monarch;
  colors.primary = palette.primary;
  colors.primaryDark = palette.primaryDark;
  colors.action = palette.primary;
  colors.border = withAlpha(palette.primary, 0.25);
  colors.borderSubtle = withAlpha(palette.primary, 0.15);
  colors.borderFaint = withAlpha(palette.primary, 0.08);
}

export async function getColorway(): Promise<ColorwayId> {
  try {
    const raw = await AsyncStorage.getItem(KEY_COLORWAY);
    return raw && raw in COLORWAYS ? (raw as ColorwayId) : 'monarch';
  } catch {
    return 'monarch';
  }
}

export async function setColorwaySetting(id: ColorwayId): Promise<void> {
  await AsyncStorage.setItem(KEY_COLORWAY, id);
}

export async function loadColorway(): Promise<void> {
  applyColorway(await getColorway());
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
export const radius   = { sm: 8, md: 12, lg: 14, xl: 20, pill: 999 };

export const fonts = {
  display: { fontWeight: '700' as const, color: colors.white, letterSpacing: -0.5 },
  bodyBold: { fontWeight: '700' as const, color: colors.white },
  body: { color: colors.text },
  caption: { color: colors.textMuted, fontSize: 13 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.8 },
};

// Dev passcode for App Review bypass
export const DEV_PASSCODE = '0420';
