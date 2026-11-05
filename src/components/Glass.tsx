import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, PressableProps, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, {
  Easing, interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence,
  withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND, colors } from '../theme';
import { hapticTap } from '../lib/haptics';

// The 2.0 look: a slow aurora behind everything, frosted glass for the
// chrome that floats over it (Apple's Liquid Glass on iOS 26, a blur
// elsewhere), translucent glass cards, and spring motion. Everything here
// honors Reduce Motion.

/* ---------- Liquid Glass availability ---------- */
type GlassModule = typeof import('expo-glass-effect');
let glassModule: GlassModule | null | undefined;
function liquidGlass(): GlassModule | null {
  if (glassModule !== undefined) return glassModule;
  glassModule = null;
  if (Platform.OS === 'ios') {
    try {
      const mod = require('expo-glass-effect') as GlassModule;
      if (mod.isLiquidGlassAvailable()) glassModule = mod;
    } catch {
      // Older native build without the module: fall back to blur.
    }
  }
  return glassModule;
}

/* ---------- Aurora ---------- */
const BLOBS = [
  { key: 'a', color: () => colors.auroraA, size: 520, top: -170, left: -160, dx: 70, dy: 60, duration: 17000 },
  { key: 'b', color: () => colors.auroraB, size: 440, top: 140, right: -190, dx: -60, dy: 90, duration: 21000 },
  { key: 'c', color: () => colors.auroraC, size: 420, bottom: -170, left: 40, dx: -50, dy: -70, duration: 25000 },
] as const;

function Blob({ blob, still }: { blob: (typeof BLOBS)[number]; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (still) return;
    t.value = withRepeat(withTiming(1, { duration: blob.duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [still, t, blob.duration]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob.dx * t.value },
      { translateY: blob.dy * t.value },
      { scale: 1 + 0.12 * t.value },
    ],
  }));
  const pos: ViewStyle = {
    position: 'absolute', width: blob.size, height: blob.size,
    top: 'top' in blob ? blob.top : undefined,
    left: 'left' in blob ? blob.left : undefined,
    right: 'right' in blob ? blob.right : undefined,
    bottom: 'bottom' in blob ? blob.bottom : undefined,
  };
  const id = `aur-${blob.key}`;
  return (
    <Animated.View style={[pos, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={blob.color()} stopOpacity={0.62} />
            <Stop offset="0.45" stopColor={blob.color()} stopOpacity={0.26} />
            <Stop offset="1" stopColor={blob.color()} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** Fills its parent with the background color and three drifting light blobs. */
export function AuroraBackground({ style }: { style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg, overflow: 'hidden' }, style]} pointerEvents="none">
      {BLOBS.map(b => <Blob key={b.key} blob={b} still={reduce} />)}
    </View>
  );
}

/* ---------- Glass surfaces ---------- */

/**
 * Real frosted glass, for chrome that floats over content (tab bar, sheets,
 * pills). Liquid Glass on iOS 26, a blur on older iOS and the web, and a
 * translucent fill on Android, where live blur is costly.
 */
export function GlassSurface({ style, children, interactive, tint, intensity = 40 }: {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  interactive?: boolean;
  /** Optional color wash, e.g. the brand blue for a primary control. */
  tint?: string;
  intensity?: number;
}) {
  const lg = liquidGlass();
  if (lg) {
    const { GlassView } = lg;
    return (
      <GlassView
        style={[{ overflow: 'hidden' }, style]}
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={tint}
        colorScheme={colors.statusBar === 'light' ? 'dark' : 'light'}
      >
        {children}
      </GlassView>
    );
  }
  const flat = StyleSheet.flatten(style) || {};
  const radius = flat.borderRadius;
  return (
    <View style={[{ overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.glassBorder }, style]}>
      {Platform.OS !== 'android' ? (
        <BlurView intensity={intensity} tint={colors.statusBar === 'light' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassSolid }]} />
      )}
      {!!tint && <View style={[StyleSheet.absoluteFill, { backgroundColor: tint, opacity: 0.35 }]} />}
      <GlassSheen radius={radius} />
      {children}
    </View>
  );
}

/** The light catching the top edge of a pane of glass. */
export function GlassSheen({ radius }: { radius?: number | string }) {
  return (
    <LinearGradient
      pointerEvents="none"
      colors={[colors.glassSheen, 'rgba(255,255,255,0)']}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.5, y: 0.6 }}
      style={[StyleSheet.absoluteFill, typeof radius === 'number' ? { borderRadius: radius } : null]}
    />
  );
}

/* ---------- Motion ---------- */

// Cards that mount together cascade in: each one waits a little longer than
// the one before, and the count resets once a screen has finished mounting.
let staggerCount = 0;
let staggerAt = 0;
export function nextStaggerDelay(): number {
  const now = Date.now();
  if (now - staggerAt > 260) staggerCount = 0;
  staggerAt = now;
  const delay = Math.min(staggerCount * 60, 420);
  staggerCount += 1;
  return delay;
}

/** Fades and lifts its children in when they mount, in a cascade with siblings. */
export function Reveal({ children, style, delay }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; delay?: number }) {
  const reduce = useReducedMotion();
  const wait = useRef(delay ?? nextStaggerDelay()).current;
  const p = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    p.value = withDelay(wait, withTiming(1, { duration: 560, easing: Easing.out(Easing.cubic) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ translateY: (1 - p.value) * 18 }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A Pressable that springs down a little under the finger, with a light haptic. */
export function PressableScale({ children, style, scaleTo = 0.965, haptic = true, onPressIn, onPressOut, ...rest }: PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style, animated]}
      onPressIn={e => {
        if (!reduce) s.value = withSpring(scaleTo, { damping: 18, stiffness: 420 });
        if (haptic) hapticTap();
        onPressIn?.(e);
      }}
      onPressOut={e => {
        s.value = withSpring(1, { damping: 14, stiffness: 260 });
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

/**
 * The main call to action: a lit gradient pill with the glass sheen, that
 * springs under the finger. Takes the caller's layout style as-is.
 */
export function GradientButton({ style, children, tone = 'blue', disabled, ...rest }: PressableProps & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  tone?: 'blue' | 'orange';
}) {
  const flat = StyleSheet.flatten(style) || {};
  const radius = typeof flat.borderRadius === 'number' ? flat.borderRadius : 14;
  const stops = tone === 'orange' ? [colors.accentLight, colors.accent] as const : [colors.primary, colors.primaryDark] as const;
  return (
    <PressableScale
      {...rest}
      disabled={disabled}
      style={[style, s.gradientShadow, { shadowColor: stops[0] }, disabled && { opacity: 0.55 }]}
    >
      <LinearGradient pointerEvents="none" colors={stops} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={[StyleSheet.absoluteFill, { borderRadius: radius }]}
      />
      {children}
    </PressableScale>
  );
}

/** Counts a number up from zero when it first appears, then follows changes. */
export function CountUp({ value, style, duration = 900, suffix = '' }: {
  value: number; style?: StyleProp<TextStyle>; duration?: number; suffix?: string;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setShown(value); return; }
    let raf = 0;
    const start = Date.now();
    const begin = from.current;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(begin + (value - begin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, reduce]);
  return <Text style={style}>{shown}{suffix}</Text>;
}

/** A card with two faces that turns over on tap. */
export function FlipCard({ front, back, style, flipped: controlled, onFlip, peekDelay }: {
  front: React.ReactNode;
  back: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flipped?: boolean;
  onFlip?: (flipped: boolean) => void;
  /** Turn over once on its own after this many ms, to show there's a back. */
  peekDelay?: number;
}) {
  const reduce = useReducedMotion();
  const [own, setOwn] = useState(false);
  const flipped = controlled ?? own;
  const r = useSharedValue(0);
  useEffect(() => {
    r.value = reduce ? (flipped ? 180 : 0) : withSpring(flipped ? 180 : 0, { damping: 16, stiffness: 120 });
  }, [flipped, reduce, r]);
  useEffect(() => {
    if (reduce || peekDelay === undefined) return;
    r.value = withDelay(peekDelay, withSequence(withSpring(180, { damping: 16, stiffness: 120 }), withDelay(1400, withSpring(0, { damping: 16, stiffness: 120 }))));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${r.value}deg` }],
    opacity: interpolate(r.value, [89, 91], [1, 0], 'clamp'),
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateY: `${r.value - 180}deg` }],
    opacity: interpolate(r.value, [89, 91], [0, 1], 'clamp'),
  }));
  const toggle = () => {
    const next = !flipped;
    if (controlled === undefined) setOwn(next);
    onFlip?.(next);
  };
  return (
    <PressableScale onPress={toggle} style={style} accessibilityRole="button" accessibilityState={{ expanded: flipped }}>
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]} pointerEvents={flipped ? 'none' : 'auto'}>{front}</Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]} pointerEvents={flipped ? 'auto' : 'none'}>{back}</Animated.View>
    </PressableScale>
  );
}

/** A chart bar that grows up from the baseline, staggered by its index. */
export function GrowBar({ style, index = 0 }: { style?: StyleProp<ViewStyle>; index?: number }) {
  const reduce = useReducedMotion();
  const g = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) g.value = withDelay(150 + index * 70, withSpring(1, { damping: 14, stiffness: 110 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scaleY: g.value }] }));
  return (
    <Animated.View style={[style, { transformOrigin: 'bottom' }, anim]}>
      <LinearGradient pointerEvents="none" colors={[BRAND.cyan, colors.primary]} style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 6, borderTopRightRadius: 6 }]} />
    </Animated.View>
  );
}

/** A soft glow that breathes, for things that need attention (a hot zone, a due entry). */
export function Pulse({ color, size, style }: { color: string; size: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1, false);
  }, [reduce, p]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.55 * (1 - p.value), transform: [{ scale: 1 + 1.4 * p.value }] }));
  if (reduce) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color }, style, anim]}
    />
  );
}

const s = StyleSheet.create({
  gradientShadow: {
    backgroundColor: 'transparent',
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 6,
  },
});
