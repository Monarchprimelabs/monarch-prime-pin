import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { colors, spacing, radius, fonts, withAlpha } from '../theme';
import { useI18n } from '../lib/i18n';
import { READABLE_MAX_WIDTH, WIDE_MAX_WIDTH, useWideLayout } from '../lib/layout';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { GlassSheen, Reveal } from './Glass';
import { hapticTap } from '../lib/haptics';

const SYMBOL: number = require('../../assets/logo-symbol.png');
const FULL_LOGO: number = require('../../assets/logo-full.png');

// ============================================================
// Disclaimer banner — required on every main screen
// ============================================================
export function Disclaimer() {
  const { t } = useI18n();
  return (
    <View style={s.disclaimer}>
      <Text style={s.warnIcon}>⚠</Text>
      <Text style={s.disclaimerText}>
        <Text style={s.disclaimerStrong}>{t('ui.researchOnly')}</Text>
        <Text>{t('ui.notForHuman')}</Text>
      </Text>
    </View>
  );
}

// ============================================================
// Brand mark — symbol for headers, full logo for splash/sign-in
// ============================================================
export function BrandMark({ large }: { large?: boolean }) {
  const size = large ? 180 : 42;
  const src = large ? FULL_LOGO : SYMBOL;

  return (
    <Image
      source={src}
      defaultSource={src}
      fadeDuration={0}
      style={{
        width: size,
        height: size,
        resizeMode: 'contain',
      }}
    />
  );
}

// ============================================================
// Header — avatar logo + title + subtitle
// ============================================================
export function Header({ title, subtitle, columns = 'one' }: {
  title: string;
  subtitle?: string;
  /** Matches the screen's content width on wide windows, so the title lines up with it. */
  columns?: 'one' | 'two';
}) {
  const wide = useWideLayout();
  const align = wide
    ? { width: '100%' as const, maxWidth: columns === 'two' ? WIDE_MAX_WIDTH : READABLE_MAX_WIDTH, alignSelf: 'center' as const }
    : undefined;
  return (
    <View style={[s.header, align]}>
      <View style={s.avatar}>
        <BrandMark />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.titleText}>{title}</Text>
        {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      </View>
    </View>
  );
}

// ============================================================
// Card — consistent panel
// ============================================================
export function Card({ children, style }: { children: React.ReactNode; style?: any }) {
  // A pane of glass over the aurora that fades up into place with its siblings.
  const radiusValue = StyleSheet.flatten([s.card, style])?.borderRadius;
  return (
    <Reveal style={[s.card, style]}>
      <GlassSheen radius={radiusValue} />
      {children}
    </Reveal>
  );
}

// ============================================================
// CardLabel — uppercase header inside cards
// ============================================================
export function CardLabel({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <View style={s.cardLabelRow}>
      {!!icon && <Text style={s.cardLabelIcon}>{icon}</Text>}
      <Text style={s.cardLabel}>{children}</Text>
    </View>
  );
}

// ============================================================
// ViewPill — Front / Back toggle
// ============================================================
export function ViewPill({
  view, setView,
}: {
  view: 'front' | 'back';
  setView: (v: 'front' | 'back') => void;
}) {
  const { t } = useI18n();
  const reduce = useReducedMotion();
  const [width, setWidth] = React.useState(0);
  const x = useSharedValue(view === 'front' ? 0 : 1);
  React.useEffect(() => {
    const target = view === 'front' ? 0 : 1;
    x.value = reduce ? target : withSpring(target, { damping: 17, stiffness: 210 });
  }, [view, reduce, x]);
  const half = (width - 6) / 2;
  const slider = useAnimatedStyle(() => ({ width: half, transform: [{ translateX: x.value * half }] }));
  return (
    <View style={s.viewPillWrap}>
      <View style={s.viewPill} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && <Animated.View pointerEvents="none" style={[s.viewSlider, slider]} />}
        {(['front', 'back'] as const).map(v => (
          <Pressable
            key={v}
            onPress={() => { if (v !== view) { hapticTap(); setView(v); } }}
            style={s.viewBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: view === v }}
          >
            <Text style={[s.viewBtnText, view === v && s.viewBtnTextActive]}>
              {v === 'front' ? t('ui.front') : t('ui.back')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ============================================================
// Markdown-lite text (bold + italic + paragraphs + bullets)
// ============================================================
export function FormattedText({ text, baseStyle }: { text: string; baseStyle?: any }) {
  const paragraphs = text.split('\n\n');
  return (
    <View>
      {paragraphs.map((p, i) => (
        <Text key={i} style={[s.formatPara, baseStyle, i === paragraphs.length - 1 && { marginBottom: 0 }]}>
          {parseInline(p)}
        </Text>
      ))}
    </View>
  );
}

function parseInline(s: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < s.length) {
    if (s[i] === '*' && s[i + 1] === '*') {
      const end = s.indexOf('**', i + 2);
      if (end > -1) {
        out.push(<Text key={key++} style={{ fontWeight: '700', color: colors.white }}>{s.slice(i + 2, end)}</Text>);
        i = end + 2; continue;
      }
    }
    if (s[i] === '_') {
      const end = s.indexOf('_', i + 1);
      if (end > -1) {
        out.push(<Text key={key++} style={{ fontStyle: 'italic', color: colors.textMuted }}>{s.slice(i + 1, end)}</Text>);
        i = end + 1; continue;
      }
    }
    let j = i;
    while (j < s.length && s[j] !== '*' && s[j] !== '_') j++;
    out.push(<Text key={key++}>{s.slice(i, j)}</Text>);
    i = j;
  }
  return out;
}

const s = StyleSheet.create({
  disclaimer: {
    backgroundColor: withAlpha(colors.accent, 0.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderOrange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warnIcon: { color: colors.accent, fontSize: 14, marginRight: 8 },
  disclaimerText: { color: colors.accentLight, fontSize: 12, fontWeight: '500', flex: 1 },
  disclaimerStrong: { color: colors.accent, fontWeight: '700' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bgCard,
    borderWidth: 1, borderColor: colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, overflow: 'hidden',
  },
  titleText: { fontSize: 30, fontWeight: '800', color: colors.white, letterSpacing: -0.8 },
  subtitle: { fontSize: 14, color: colors.text, opacity: 0.72, marginTop: 2 },

  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: colors.glassBorder,
    // Lighter top edge + soft drop shadow fake a light source above the glass.
    borderTopColor: colors.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: colors.cardShadow,
    shadowRadius: 24,
    elevation: 4,
  },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  cardLabelIcon: { color: colors.primary, fontSize: 14, marginRight: 6 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

  viewPillWrap: { alignItems: 'center', marginBottom: 6 },
  viewPill: {
    flexDirection: 'row',
    backgroundColor: colors.bgPill,
    borderWidth: 1, borderColor: colors.glassBorder,
    borderRadius: 13, padding: 3,
  },
  viewBtn: { paddingHorizontal: 26, paddingVertical: 9, borderRadius: 10, minWidth: 92, alignItems: 'center' },
  viewSlider: {
    position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 10,
    backgroundColor: withAlpha(colors.primary, 0.24),
    borderWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(colors.primary, 0.5),
  },
  viewBtnText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  viewBtnTextActive: { color: colors.white },

  logoSymbol: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 140, 0, 0.16)',
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSymbolText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoWordmark: {
    width: 160,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderOrange,
    backgroundColor: 'rgba(255, 140, 0, 0.08)',
  },
  logoWordmarkMain: {
    color: colors.accent,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  logoWordmarkSub: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 6,
  },

  formatPara: { color: colors.text, fontSize: 14, lineHeight: 22, marginBottom: 8 },
});
