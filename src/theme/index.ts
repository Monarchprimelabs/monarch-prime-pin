import { DynamicColorIOS, Platform } from 'react-native';

const adaptive = (light: string, dark: string): any => (
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : dark
);

export const colors = {
  bg: adaptive('#E8F0F9', '#050810'),
  bgCard: adaptive('#F6FAFF', 'rgba(15, 25, 45, 0.4)'),
  bgInput: adaptive('#DFEAF6', 'rgba(10, 20, 38, 0.5)'),
  bgPill: adaptive('#D7E5F4', 'rgba(10, 20, 38, 0.6)'),
  bgSheet: adaptive('#EDF5FC', '#0a1019'),

  border: adaptive('rgba(21, 101, 192, 0.36)', 'rgba(30, 136, 229, 0.25)'),
  borderSubtle: adaptive('rgba(21, 101, 192, 0.24)', 'rgba(30, 136, 229, 0.15)'),
  borderFaint: adaptive('rgba(21, 101, 192, 0.14)', 'rgba(30, 136, 229, 0.08)'),
  borderOrange: adaptive('rgba(194, 92, 0, 0.28)', 'rgba(255, 140, 0, 0.25)'),

  text: adaptive('#182538', '#E8EEF7'),
  textMuted: adaptive('#52657D', '#7B8FAB'),
  textFaint: adaptive('#6B7C91', '#5A6B85'),
  textDim: adaptive('#8290A2', '#3A4A66'),
  white: adaptive('#111827', '#FFFFFF'),

  primary: adaptive('#1565C0', '#1E88E5'),
  primaryDark: '#1565C0',
  accent: adaptive('#C25C00', '#FF8C00'),
  accentLight: adaptive('#874000', '#FFB066'),
  gold: adaptive('#A06B00', '#FFD700'),
  teal: adaptive('#087E72', '#14b8a6'),
  red: adaptive('#C62828', '#E53935'),

  disclaimerBg1: adaptive('#FBE8C9', '#2a1a08'),
  disclaimerBg2: adaptive('#FFF2DD', '#1a1004'),
};

export const severity = {
  none: colors.teal,
  mild: colors.primary,
  mod: colors.accent,
  sev: colors.red,
};

export const density = {
  unused:   { ring: colors.primary, dot: colors.primary },
  light:    { ring: colors.teal,    dot: colors.teal },
  moderate: { ring: colors.accent,  dot: colors.accent },
  heavy:    { ring: colors.red,     dot: colors.red },
};

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
