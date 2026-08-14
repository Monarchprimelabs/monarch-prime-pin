import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg from 'react-native-svg';
import { MannequinFront } from './Mannequin';
import { colors, withAlpha } from '../theme';

const LOGO: number = require('../../assets/logo-symbol.png');

export type ShareFormat = 'story' | 'post' | 'square';

// Native export sizes for each platform. Rendering happens at BASE_W logical
// points and captureRef resizes to these on export, so one layout serves all
// three without re-tuning.
export const SHARE_FORMATS: Record<ShareFormat, {
  labelKey: string;
  export: { width: number; height: number };
  ratio: number;      // height / width
  hero: number;       // hero numeral size at BASE_W
  statsPerRow: number;
}> = {
  story:  { labelKey: 'share.formatStory',  export: { width: 1080, height: 1920 }, ratio: 1920 / 1080, hero: 118, statsPerRow: 2 },
  post:   { labelKey: 'share.formatPost',   export: { width: 1080, height: 1350 }, ratio: 1350 / 1080, hero: 96,  statsPerRow: 2 },
  square: { labelKey: 'share.formatSquare', export: { width: 1080, height: 1080 }, ratio: 1, hero: 78, statsPerRow: 4 },
};

export const BASE_W = 360;
// Row widths are sized to provably fit BASE_W minus padding at this gap:
// 2-up = 2x48% + 10 = 306 < 308; 4-up = 4x22% + 30 = 308 < 316.
const STAT_GAP = 10;
export const cardHeight = (format: ShareFormat) => Math.round(BASE_W * SHARE_FORMATS[format].ratio);

export type ProgressStats = {
  total: number;
  streak: number;
  longestStreak: number;
  monthCount: number;
  zonesUsed: number;
};

type Props = {
  format: ShareFormat;
  stats: ProgressStats;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

// Rendered twice by the share sheet: once off-screen at full size for the
// capture, once scaled down for the preview. Keep it pure — identical props
// must produce identical pixels.
export function ProgressCard({ format, stats, t }: Props) {
  const spec = SHARE_FORMATS[format];
  const height = cardHeight(format);
  const tall = spec.ratio > 1.1;

  const statItems = [
    { value: t('share.days', { n: stats.streak }), label: t('share.sStreak') },
    { value: t('share.days', { n: stats.longestStreak }), label: t('share.sBest') },
    { value: String(stats.monthCount), label: t('share.sMonth') },
    { value: String(stats.zonesUsed), label: t('share.sZones') },
  ];

  return (
    <View style={[s.card, { width: BASE_W, height }]}>
      {/* Body-map watermark — faint, behind everything */}
      <View style={s.watermark} pointerEvents="none">
        <Svg viewBox="0 0 100 110" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
          <MannequinFront />
        </Svg>
      </View>

      <View style={s.accentTop} />

      <View style={[s.body, { paddingHorizontal: tall ? 26 : 22, paddingTop: tall ? 24 : 18 }]}>
        <View style={s.header}>
          <Image source={LOGO} style={s.logo} resizeMode="contain" />
          <Text style={s.brand}>MONARCH PRIME PIN</Text>
        </View>

        <View style={s.heroBlock}>
          <Text
            style={[s.hero, { fontSize: spec.hero, lineHeight: spec.hero * 1.02 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling={false}
          >
            {stats.total}
          </Text>
          <View style={s.heroRule} />
          <Text style={s.heroLabel} allowFontScaling={false}>{t('share.records').toUpperCase()}</Text>
        </View>

        <View style={[s.statGrid, { marginBottom: tall ? 22 : 14 }]}>
          {statItems.map(item => (
            <View
              key={item.label}
              style={[
                s.stat,
                {
                  width: spec.statsPerRow === 2 ? '48%' : '22%',
                  paddingVertical: tall ? 14 : 10,
                },
              ]}
            >
              <Text
                style={[s.statValue, { fontSize: spec.statsPerRow === 2 ? 26 : 18 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                allowFontScaling={false}
              >
                {item.value}
              </Text>
              <Text style={s.statLabel} numberOfLines={1} allowFontScaling={false}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={s.cta}>
        <Text style={s.ctaTitle} allowFontScaling={false}>{t('share.ctaTitle')}</Text>
        <Text style={s.ctaSub} allowFontScaling={false}>{t('share.ctaSub')}</Text>
      </View>
      <Text style={s.compliance} allowFontScaling={false}>{t('share.compliance')}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  watermark: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.09,
    paddingVertical: '12%',
  },
  accentTop: { height: 7, backgroundColor: colors.accent },
  body: { flex: 1, justifyContent: 'space-between' },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 30, height: 30 },
  brand: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.9,
  },

  heroBlock: { alignItems: 'flex-start' },
  hero: {
    color: colors.white,
    fontWeight: '900',
    letterSpacing: -4,
  },
  heroRule: {
    width: 74,
    height: 5,
    backgroundColor: colors.accent,
    marginTop: 4,
    marginBottom: 9,
  },
  heroLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 3.2,
  },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: STAT_GAP },
  stat: {
    backgroundColor: withAlpha(colors.primary, 0.14),
    borderWidth: 1.5,
    borderColor: withAlpha(colors.primary, 0.45),
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: { color: colors.primary, fontWeight: '900', letterSpacing: -0.5 },
  statLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 3,
  },

  cta: {
    backgroundColor: colors.accent,
    paddingVertical: 13,
    alignItems: 'center',
  },
  ctaTitle: {
    color: '#1A0E00',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2.4,
  },
  ctaSub: {
    color: '#2E1A03',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 2,
  },
  compliance: {
    backgroundColor: colors.bg,
    color: colors.textFaint,
    fontSize: 8.5,
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
