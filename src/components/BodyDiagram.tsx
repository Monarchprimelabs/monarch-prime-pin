import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { ZONES, Zone, ZONE_DENSITY, DensityLevel } from '../data/peptides';
import { density as densityColors } from '../theme';
import { MannequinFront, MannequinBack } from './Mannequin';

type Props = {
  view: 'front' | 'back';
  mode: 'heatmap' | 'select';
  selected?: string[];
  onZoneTap?: (id: string) => void;
};

export function BodyDiagram({ view, mode, selected = [], onZoneTap }: Props) {
  const zones = view === 'front' ? ZONES.front : ZONES.back;

  return (
    <View style={s.wrap}>
      <Svg viewBox="0 0 100 110" width="100%" height={400}>
        {view === 'front' ? <MannequinFront /> : <MannequinBack />}

        {zones.map(z => {
          if (mode === 'heatmap') {
            const lvl: DensityLevel = ZONE_DENSITY[z.id] || 'unused';
            const c = densityColors[lvl];
            return (
              <G key={z.id}>
                <Circle cx={z.cx} cy={z.cy} r={z.r} fill="rgba(10, 25, 50, 0.6)" stroke={c.ring} strokeWidth="0.5" />
                <Circle cx={z.cx} cy={z.cy} r={z.r * 0.35} fill={c.dot} />
              </G>
            );
          } else {
            const isSelected = selected.includes(z.id);
            return (
              <G key={z.id} onPress={() => onZoneTap?.(z.id)}>
                <Circle
                  cx={z.cx}
                  cy={z.cy}
                  r={z.r * 1.5}
                  fill="transparent"
                />
                <Circle
                  cx={z.cx}
                  cy={z.cy}
                  r={z.r}
                  fill={isSelected ? 'rgba(255, 140, 0, 0.25)' : 'rgba(10, 25, 50, 0.6)'}
                  stroke={isSelected ? '#FF8C00' : '#1E88E5'}
                  strokeWidth={isSelected ? '0.7' : '0.5'}
                />
                <Circle
                  cx={z.cx}
                  cy={z.cy}
                  r={z.r * 0.35}
                  fill={isSelected ? '#FF8C00' : '#1E88E5'}
                />
              </G>
            );
          }
        })}
      </Svg>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
});
