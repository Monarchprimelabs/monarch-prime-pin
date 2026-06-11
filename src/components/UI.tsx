import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { colors, spacing, radius, fonts } from '../theme';

const SYMBOL: number = require('../../assets/logo-symbol.png');
const FULL_LOGO: number = require('../../assets/logo-full.png');

// ============================================================
// Disclaimer banner — required on every main screen
// ============================================================
export function Disclaimer() {
  return (
    <View style={s.disclaimer}>
      <Text style={s.warnIcon}>⚠</Text>
      <Text style={s.disclaimerText}>
        <Text style={s.disclaimerStrong}>FOR RESEARCH USE ONLY</Text>
        <Text> — Not for human consumption</Text>
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
export function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={s.header}>
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
  return <View style={[s.card, style]}>{children}</View>;
}

// ============================================================
// CardLabel — uppercase header inside cards
// ============================================================
export function CardLabel({ icon, children }: { icon?: string; children: React.ReactNode }) {
  return (
    <View style={s.cardLabelRow}>
      {!!icon && <Text style={{ fontSize: 14, marginRight: 6 }}>{icon}</Text>}
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
  return (
    <View style={s.viewPillWrap}>
      <View style={s.viewPill}>
        {(['front', 'back'] as const).map(v => (
          <Pressable
            key={v}
            onPress={() => setView(v)}
            style={[s.viewBtn, view === v && s.viewBtnActive]}
          >
            <Text style={[s.viewBtnText, view === v && s.viewBtnTextActive]}>
              {v === 'front' ? 'Front' : 'Back'}
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
    backgroundColor: colors.disclaimerBg1,
    borderBottomWidth: 1,
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
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14, overflow: 'hidden',
  },
  titleText: { fontSize: 26, fontWeight: '700', color: colors.white, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  card: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.lg,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  cardLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },

  viewPillWrap: { alignItems: 'center', marginBottom: 6 },
  viewPill: {
    flexDirection: 'row',
    backgroundColor: colors.bgPill,
    borderWidth: 1, borderColor: 'rgba(30, 136, 229, 0.2)',
    borderRadius: 10, padding: 3,
  },
  viewBtn: { paddingHorizontal: 22, paddingVertical: 8, borderRadius: 8 },
  viewBtnActive: { backgroundColor: 'rgba(30, 136, 229, 0.2)' },
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
