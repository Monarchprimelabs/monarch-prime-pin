import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { MannequinFront } from './Mannequin';
import { SHARE_PALETTE as P, withAlpha } from '../theme';

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
  ring: number;       // streak ring diameter; 0 = no ring (stats row only)
}> = {
  story:  { labelKey: 'share.formatStory',  export: { width: 1080, height: 1920 }, ratio: 1920 / 1080, hero: 132, ring: 150 },
  post:   { labelKey: 'share.formatPost',   export: { width: 1080, height: 1350 }, ratio: 1350 / 1080, hero: 100, ring: 0 },
  square: { labelKey: 'share.formatSquare', export: { width: 1080, height: 1080 }, ratio: 1, hero: 84, ring: 0 },
};

export const BASE_W = 360;
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
  /** Already formatted by the caller (e.g. "OCTOBER 2026"), so the card stays pure. */
  asOf: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

// SHARE_PALETTE is fixed (never follows the app theme): deep navy ground,
// brand orange as a thin metal accent, brand blue for the streak.
const NAVY_TOP = P.navyTop;
const NAVY_BOTTOM = P.navyBottom;
const AMBER = P.amber;

// Rendered twice by the share sheet: once off-screen at full size for the
// capture, once scaled down for the preview. Keep it pure — identical props
// must produce identical pixels. No compound names, ever (AUDIT_CHECKLIST §4).
export function ProgressCard({ format, stats, asOf, t }: Props) {
  const spec = SHARE_FORMATS[format];
  const height = cardHeight(format);
  const pad = format === 'story' ? 34 : 28;
  const inner = BASE_W - pad * 2;

  // Long totals shrink so they always fit one line of the hero.
  const digits = String(stats.total).length;
  const heroSize = Math.min(spec.hero, Math.floor((inner * 1.55) / Math.max(digits, 1)));

  const ringStats = spec.ring > 0;
  const statItems = [
    ...(ringStats ? [] : [{ value: String(stats.streak), label: t('share.sStreak') }]),
    { value: String(stats.longestStreak), label: t('share.sBest') },
    { value: String(stats.monthCount), label: t('share.sMonth') },
    { value: String(stats.zonesUsed), label: t('share.sZones') },
  ];

  const ringR = spec.ring / 2 - 7;
  const ringC = 2 * Math.PI * ringR;
  const best = Math.max(stats.longestStreak, stats.streak, 1);
  const ringFraction = Math.min(1, stats.streak / best);

  return (
    <View style={[s.card, { width: BASE_W, height }]}>
      {/* Ground: navy gradient with two soft glows */}
      <Svg style={StyleSheet.absoluteFill} width={BASE_W} height={height}>
        <Defs>
          <LinearGradient id="ground" x1="0" y1="0" x2="0.6" y2="1">
            <Stop offset="0" stopColor={NAVY_TOP} />
            <Stop offset="1" stopColor={NAVY_BOTTOM} />
          </LinearGradient>
          <RadialGradient id="glowA" cx="0.9" cy="0.05" r="0.7">
            <Stop offset="0" stopColor={P.accent} stopOpacity="0.28" />
            <Stop offset="1" stopColor={P.accent} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="glowB" cx="0.05" cy="0.95" r="0.75">
            <Stop offset="0" stopColor={P.primary} stopOpacity="0.30" />
            <Stop offset="1" stopColor={P.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={BASE_W} height={height} fill="url(#ground)" />
        <Rect x="0" y="0" width={BASE_W} height={height} fill="url(#glowA)" />
        <Rect x="0" y="0" width={BASE_W} height={height} fill="url(#glowB)" />
      </Svg>

      {/* Body-map watermark, very faint, right-aligned */}
      <View style={[s.watermark, { height: height * 0.62, top: height * 0.2 }]} pointerEvents="none">
        <Svg viewBox="0 0 100 110" width="100%" height="100%" preserveAspectRatio="xMaxYMid meet">
          <MannequinFront />
        </Svg>
      </View>

      {/* Hairline frame */}
      <View style={s.frame} pointerEvents="none" />

      <View style={[s.body, { padding: pad, paddingTop: pad + 6 }]}>
        <View style={s.header}>
          <View style={s.brandRow}>
            <Image source={LOGO} style={s.logo} resizeMode="contain" />
            <View>
              <Text style={s.brand} allowFontScaling={false}>MONARCH PRIME</Text>
              <Text style={s.brandSub} allowFontScaling={false}>PIN</Text>
            </View>
          </View>
          <Text style={s.asOf} allowFontScaling={false}>{asOf}</Text>
        </View>

        <View>
          <Svg width={inner} height={heroSize * 1.05}>
            <Defs>
              <LinearGradient id="heroInk" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={AMBER} />
                <Stop offset="1" stopColor={P.accent} />
              </LinearGradient>
            </Defs>
            <SvgText
              x="0"
              y={heroSize * 0.86}
              fontSize={heroSize}
              fontWeight="900"
              letterSpacing={-heroSize * 0.03}
              fill="url(#heroInk)"
            >
              {String(stats.total)}
            </SvgText>
          </Svg>
          <Text style={s.heroLabel} allowFontScaling={false}>{t('share.records').toUpperCase()}</Text>
        </View>

        {ringStats && (
          <View style={s.ringRow}>
            <View style={{ width: spec.ring, height: spec.ring }}>
              <Svg width={spec.ring} height={spec.ring}>
                <Defs>
                  <LinearGradient id="ringInk" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={P.ringLight} />
                    <Stop offset="1" stopColor={P.primary} />
                  </LinearGradient>
                </Defs>
                <Circle cx={spec.ring / 2} cy={spec.ring / 2} r={ringR} stroke={withAlpha(P.ink, 0.08)} strokeWidth={8} fill="none" />
                <Circle
                  cx={spec.ring / 2}
                  cy={spec.ring / 2}
                  r={ringR}
                  stroke="url(#ringInk)"
                  strokeWidth={8}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={`${ringC * ringFraction} ${ringC}`}
                  transform={`rotate(-90 ${spec.ring / 2} ${spec.ring / 2})`}
                />
              </Svg>
              <View style={s.ringCenter}>
                <Text style={s.ringValue} allowFontScaling={false}>{stats.streak}</Text>
                <Text style={s.ringLabel} allowFontScaling={false}>{t('share.sStreak')}</Text>
              </View>
            </View>
          </View>
        )}

        <View>
          <View style={s.rule} />
          <View style={s.statRow}>
            {statItems.map((item, index) => (
              <View key={item.label} style={[s.stat, index > 0 && s.statDivider]}>
                <Text style={[s.statValue, { fontSize: statItems.length > 3 ? 22 : 26 }]} numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false}>
                  {item.value}
                </Text>
                <Text style={s.statLabel} numberOfLines={1} allowFontScaling={false}>{item.label}</Text>
              </View>
            ))}
          </View>
          <View style={s.rule} />
          <View style={s.footer}>
            <Text style={s.cta} numberOfLines={1} allowFontScaling={false}>{t('share.ctaTitle')}</Text>
            <Text style={s.ctaSub} allowFontScaling={false}>{t('share.ctaSub')}</Text>
          </View>
          <Text style={s.compliance} allowFontScaling={false}>{t('share.compliance')}</Text>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: NAVY_BOTTOM, overflow: 'hidden' },
  watermark: { position: 'absolute', right: -40, width: '70%', opacity: 0.07 },
  frame: {
    position: 'absolute', top: 12, left: 12, right: 12, bottom: 12,
    borderRadius: 22, borderWidth: 1, borderColor: withAlpha(P.accent, 0.38),
  },
  body: { flex: 1, justifyContent: 'space-between' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 28, height: 28 },
  brand: { color: P.ink, fontSize: 11, fontWeight: '800', letterSpacing: 3.2 },
  brandSub: { color: P.accent, fontSize: 9, fontWeight: '800', letterSpacing: 4, marginTop: 2 },
  asOf: { color: P.muted, fontSize: 9, fontWeight: '700', letterSpacing: 2.2 },

  heroLabel: { color: P.text, fontSize: 11, fontWeight: '800', letterSpacing: 4, marginTop: 4 },

  ringRow: { alignItems: 'flex-start' },
  ringCenter: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  ringValue: { color: P.ink, fontSize: 40, fontWeight: '900', letterSpacing: -1 },
  ringLabel: { color: P.muted, fontSize: 9, fontWeight: '800', letterSpacing: 2.6, marginTop: 2 },

  rule: { height: StyleSheet.hairlineWidth * 2, backgroundColor: withAlpha(P.ink, 0.14) },
  statRow: { flexDirection: 'row', paddingVertical: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { borderLeftWidth: 1, borderLeftColor: withAlpha(P.ink, 0.1) },
  statValue: { color: P.ink, fontWeight: '800' },
  statLabel: { color: P.muted, fontSize: 8.5, fontWeight: '800', letterSpacing: 1.8, marginTop: 4 },

  footer: { paddingTop: 12, gap: 3 },
  cta: { color: P.accent, fontSize: 12, fontWeight: '900', letterSpacing: 2.6 },
  ctaSub: { color: P.muted, fontSize: 9, fontWeight: '600', letterSpacing: 0.4 },
  compliance: { color: P.faint, fontSize: 8, letterSpacing: 0.8, marginTop: 8 },
});
