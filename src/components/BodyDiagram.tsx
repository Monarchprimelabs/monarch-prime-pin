import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Svg from 'react-native-svg';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring } from 'react-native-reanimated';
import { ZONES } from '../data/peptides';
import { heatColors, colors, withAlpha } from '../theme';
import type { HeatBand } from '../lib/heat';
import { MannequinFront, MannequinBack } from './Mannequin';
import { Pulse } from './Glass';
import { hapticTap } from '../lib/haptics';

type Props = {
  view: 'front' | 'back';
  mode: 'heatmap' | 'select';
  selected?: string[];
  onZoneTap?: (id: string) => void;
  bandsByZone?: Record<string, HeatBand>;
};

const VIEW_W = 100;
const VIEW_H = 110;
const HEIGHT = 400;

// The figure is drawn in SVG; the zones sit on top as native views so they
// can bloom in, pulse and spring on tap. Their positions use the same
// "meet" scaling the SVG applies to its viewBox.
export function BodyDiagram({ view, mode, selected = [], onZoneTap, bandsByZone = {} }: Props) {
  const zones = view === 'front' ? ZONES.front : ZONES.back;
  const [width, setWidth] = useState(0);
  const scale = Math.min(width / VIEW_W, HEIGHT / VIEW_H);
  const offsetX = (width - VIEW_W * scale) / 2;
  const offsetY = (HEIGHT - VIEW_H * scale) / 2;
  // Replays the bloom whenever the side or the data changes.
  const bloomKey = `${view}:${zones.map(z => bandsByZone[z.id] || 'clear').join(',')}`;

  return (
    <View style={s.wrap}>
      <View style={s.stage} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
        <Svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" height={HEIGHT}>
          {view === 'front' ? <MannequinFront /> : <MannequinBack />}
        </Svg>
        {width > 0 && zones.map((z, i) => (
          <Zone
            key={`${z.id}-${mode === 'heatmap' ? bloomKey : view}`}
            x={offsetX + z.cx * scale}
            y={offsetY + z.cy * scale}
            radius={z.r * scale}
            index={i}
            mode={mode}
            band={bandsByZone[z.id] || 'clear'}
            selected={selected.includes(z.id)}
            onPress={onZoneTap ? () => onZoneTap(z.id) : undefined}
            label={z.label}
          />
        ))}
      </View>
    </View>
  );
}

function Zone({ x, y, radius, index, mode, band, selected, onPress, label }: {
  x: number; y: number; radius: number; index: number; mode: Props['mode'];
  band: HeatBand; selected: boolean; onPress?: () => void; label: string;
}) {
  const reduce = useReducedMotion();
  const grow = useSharedValue(reduce ? 1 : 0);
  const pop = useSharedValue(1);
  useEffect(() => {
    if (!reduce) grow.value = withDelay(80 + index * 40, withSpring(1, { damping: 11, stiffness: 160 }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: grow.value * pop.value }] }));

  const size = radius * 2;
  const heat = heatColors[band];
  const ring = mode === 'heatmap' ? heat.ring : selected ? colors.accent : colors.primary;
  const dot = mode === 'heatmap' ? heat.dot : selected ? colors.accent : colors.primary;
  const fill = mode === 'select' && selected ? withAlpha(colors.accent, 0.25) : colors.zoneFill;
  const hot = mode === 'heatmap' && (band === 'orange' || band === 'red');
  const glow = mode === 'heatmap' && band !== 'clear';

  const body = (
    <Animated.View
      style={[
        s.zone,
        { width: size, height: size, borderRadius: radius, borderColor: ring, backgroundColor: fill, borderWidth: Math.max(1, size * (selected ? 0.07 : 0.05)) },
        glow && { shadowColor: heat.dot, shadowOpacity: 0.8, shadowRadius: size * 0.45, shadowOffset: { width: 0, height: 0 } },
        anim,
      ]}
    >
      <View style={{ width: size * 0.36, height: size * 0.36, borderRadius: size, backgroundColor: dot }} />
    </Animated.View>
  );

  // Hit area a little larger than the drawn circle, as in the old SVG version.
  const hit = size * 1.5;
  return (
    <View pointerEvents="box-none" style={[s.anchor, { left: x - hit / 2, top: y - hit / 2, width: hit, height: hit }]}>
      {hot && <Pulse color={heat.dot} size={size} />}
      {onPress ? (
        <Pressable
          onPress={() => {
            hapticTap();
            if (!reduce) pop.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1, { damping: 9, stiffness: 220 }));
            onPress();
          }}
          style={s.hit}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={{ selected }}
        >
          {body}
        </Pressable>
      ) : body}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8, width: '100%' },
  stage: { width: '100%', height: HEIGHT },
  anchor: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  hit: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  zone: { alignItems: 'center', justifyContent: 'center' },
});
