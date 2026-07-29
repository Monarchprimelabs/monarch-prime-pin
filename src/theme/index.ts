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

export const severity = {
  none: colors.teal,
  mild: colors.primary,
  mod: colors.accent,
  sev: colors.red,
};

// Heatmap band colors — clear = rested (neutral outline), then a cool→hot
// ramp. Band meaning is logging cadence, decided in src/lib/heatMath.js.
export const heatColors = {
  clear:  { ring: 'rgba(122, 143, 173, 0.55)', dot: 'rgba(122, 143, 173, 0.4)' },
  blue:   { ring: colors.primary, dot: colors.primary },
  green:  { ring: '#34D399', dot: '#34D399' },
  yellow: { ring: '#FACC15', dot: '#FACC15' },
  orange: { ring: colors.accent, dot: colors.accent },
  red:    { ring: colors.red, dot: colors.red },
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
