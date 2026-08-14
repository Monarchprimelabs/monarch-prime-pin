import AsyncStorage from '@react-native-async-storage/async-storage';

/** Convert '#RRGGBB' to an rgba() string. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ============================================================
// Brand palette — taken from the Monarch Prime logo.
// Change a brand hue HERE and both themes follow.
// ============================================================
export const BRAND = {
  navy:   '#12305F', // wordmark + figure silhouette
  blue:   '#1E88E5', // left helix / globe ocean
  orange: '#F5871F', // "PRIME" wordmark + right helix
  green:  '#43A047', // swoosh + globe landmass
  cyan:   '#29ABE2', // helix highlights
};

export type ThemeId = 'dark' | 'light';

type Palette = {
  bg: string; bgCard: string; bgInput: string; bgPill: string; bgSheet: string;
  bgTabBar: string; scrim: string;
  hairline: string;      // top-edge highlight that fakes a light source
  zoneFill: string;      // body-map dot interior
  border: string; borderSubtle: string; borderFaint: string; borderOrange: string;
  text: string; textMuted: string; textFaint: string; textDim: string; white: string;
  primary: string; primaryDark: string; action: string; actionText: string;
  accent: string; accentLight: string; gold: string; teal: string; red: string;
  disclaimerBg1: string; disclaimerBg2: string;
  cardShadow: number;     // drop-shadow strength; light mode needs far less
  statusBar: 'light' | 'dark';
};

const DARK: Palette = {
  bg: '#050810',
  bgCard: 'rgba(15, 25, 45, 0.4)',
  bgInput: 'rgba(10, 20, 38, 0.5)',
  bgPill: 'rgba(10, 20, 38, 0.6)',
  bgSheet: '#0a1019',
  bgTabBar: 'rgba(5, 8, 16, 0.62)',
  scrim: 'rgba(2, 6, 14, 0.94)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  zoneFill: 'rgba(10, 25, 50, 0.6)',
  border: withAlpha(BRAND.blue, 0.25),
  borderSubtle: withAlpha(BRAND.blue, 0.15),
  borderFaint: withAlpha(BRAND.blue, 0.08),
  borderOrange: withAlpha(BRAND.orange, 0.25),
  text: '#E8EEF7',
  textMuted: '#7B8FAB',
  textFaint: '#5A6B85',
  textDim: '#3A4A66',
  white: '#FFFFFF',
  primary: BRAND.blue,
  primaryDark: '#1565C0',
  action: BRAND.blue,
  actionText: '#FFFFFF',
  accent: BRAND.orange,
  accentLight: '#FFB066',
  gold: '#FFD700',
  teal: BRAND.green,
  red: '#E53935',
  disclaimerBg1: '#2a1a08',
  disclaimerBg2: '#1a1004',
  cardShadow: 0.3,
  statusBar: 'light',
};

// Light mode keeps the same brand hues but darkens them enough to hold
// contrast on white, and uses the logo's navy as the ink color.
const LIGHT: Palette = {
  // Structure comes from white cards sitting on a cool grey ground, the way
  // FuelRing does it — borders stay near-invisible so the contrast does the
  // work instead of outlines.
  bg: '#E9EEF4',
  bgCard: '#FFFFFF',
  bgInput: '#FFFFFF',
  bgPill: '#E3EAF2',
  bgSheet: '#FFFFFF',
  bgTabBar: 'rgba(255, 255, 255, 0.86)',
  scrim: 'rgba(10, 24, 45, 0.5)',
  hairline: 'rgba(255, 255, 255, 0.9)',
  zoneFill: 'rgba(30, 136, 229, 0.08)',
  border: withAlpha(BRAND.navy, 0.09),
  borderSubtle: withAlpha(BRAND.navy, 0.06),
  borderFaint: withAlpha(BRAND.navy, 0.035),
  borderOrange: withAlpha('#C2670A', 0.3),
  text: '#123157',
  textMuted: '#5C7189',
  textFaint: '#8A9AAE',
  textDim: '#A8B4C4',
  white: '#0A2540',           // "white" means max-contrast ink in both themes
  primary: '#1565C0',
  primaryDark: '#0D47A1',
  action: '#1565C0',
  actionText: '#FFFFFF',
  accent: '#D9770A',
  accentLight: '#B35F06',
  gold: '#B8860B',
  teal: '#2E7D32',
  red: '#C62828',
  disclaimerBg1: '#FDEFD8',
  disclaimerBg2: '#FBE4C2',
  cardShadow: 0.07,
  statusBar: 'dark',
};

export const THEMES: Record<ThemeId, { labelKey: string; swatch: string; palette: Palette }> = {
  dark:  { labelKey: 'settings.themeDark',  swatch: '#0B224A', palette: DARK },
  light: { labelKey: 'settings.themeLight', swatch: '#F4F7FC', palette: LIGHT },
};

export const KEY_THEME = '@mpp/theme';

// Live palette. Mutated by applyTheme() before any screen module is imported,
// because StyleSheets capture these values at import time.
export const colors = { ...DARK };

// The share card is a social asset — it stays dark in both themes so posts
// look consistent and on-brand regardless of the user's app theme.
export const SHARE_PALETTE = {
  bg: DARK.bg,
  card: DARK.bgCard,
  ink: '#FFFFFF',
  text: DARK.text,
  muted: DARK.textMuted,
  faint: DARK.textFaint,
  primary: BRAND.blue,
  accent: BRAND.orange,
};

// Data-semantic: severity never follows the theme's accent.
export const severity = {
  none: BRAND.green,
  mild: BRAND.blue,
  mod: BRAND.orange,
  sev: '#E53935',
};

// Heatmap band colors — clear = rested, then a cool→hot ramp. Band meaning is
// logging cadence (src/lib/heatMath.js). Fixed hues so a "red zone" reads the
// same in both themes.
export const heatColors = {
  clear:  { ring: 'rgba(122, 143, 173, 0.55)', dot: 'rgba(122, 143, 173, 0.4)' },
  blue:   { ring: BRAND.blue, dot: BRAND.blue },
  green:  { ring: '#34D399', dot: '#34D399' },
  yellow: { ring: '#FACC15', dot: '#FACC15' },
  orange: { ring: BRAND.orange, dot: BRAND.orange },
  red:    { ring: '#E53935', dot: '#E53935' },
};

export function applyTheme(id: ThemeId): void {
  Object.assign(colors, (THEMES[id] ?? THEMES.dark).palette);
}

export async function getTheme(): Promise<ThemeId> {
  try {
    const raw = await AsyncStorage.getItem(KEY_THEME);
    if (raw === 'light' || raw === 'dark') return raw;
    // Migrate the v1.5 colorway setting: every colorway was a dark theme.
    const legacy = await AsyncStorage.getItem('@mpp/colorway');
    return legacy ? 'dark' : 'dark';
  } catch {
    return 'dark';
  }
}

export async function setThemeSetting(id: ThemeId): Promise<void> {
  await AsyncStorage.setItem(KEY_THEME, id);
}

export async function loadTheme(): Promise<void> {
  applyTheme(await getTheme());
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
