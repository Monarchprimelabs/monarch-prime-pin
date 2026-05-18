import React from 'react';
import Svg, { G, Path, Rect, Ellipse, Line, Circle } from 'react-native-svg';
import { colors } from '../theme';

const STROKE = colors.primary;
const FILL = 'rgba(10, 30, 60, 0.45)';
const SW = 0.6;

export function MannequinFront() {
  return (
    <G fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M 50 6 Q 56 6 56 13 Q 56 19 50 19.5 Q 44 19 44 13 Q 44 6 50 6 Z" />
      <Rect x="47.5" y="19" width="5" height="2.5" rx="1" />
      <Path d="M 50 21.5 Q 38 22 32 26 Q 27 30 27 35 Q 27 42 28 48 Q 29 53 32 55 Q 38 57 50 57 Q 62 57 68 55 Q 71 53 72 48 Q 73 42 73 35 Q 73 30 68 26 Q 62 22 50 21.5 Z" />
      <Path d="M 32 28 Q 35 35 36 45 Q 38 53 44 55" fill="none" strokeWidth="0.3" opacity="0.5" />
      <Path d="M 68 28 Q 65 35 64 45 Q 62 53 56 55" fill="none" strokeWidth="0.3" opacity="0.5" />
      <Path d="M 28 27 Q 22 28 20 33 Q 19 38 20 43 Q 21 47 24 47 Q 27 47 28 43 Q 29 38 28 33 Q 28 30 28 27 Z" />
      <Path d="M 21 47 Q 18 48 17 53 Q 16 58 17 62 Q 18 65 21 65 Q 24 65 25 62 Q 26 58 25 53 Q 24 49 22 47 Z" />
      <Path d="M 72 27 Q 78 28 80 33 Q 81 38 80 43 Q 79 47 76 47 Q 73 47 72 43 Q 71 38 72 33 Q 72 30 72 27 Z" />
      <Path d="M 79 47 Q 82 48 83 53 Q 84 58 83 62 Q 82 65 79 65 Q 76 65 75 62 Q 74 58 75 53 Q 76 49 78 47 Z" />
      <Path d="M 35 56 Q 35 61 37 64 Q 42 65 50 65 Q 58 65 63 64 Q 65 61 65 56" />
      <Path d="M 38 64 Q 35 66 35 75 Q 35 84 37 88 Q 41 89 45 88 Q 47 84 47 75 Q 47 66 45 64 Q 41 63 38 64 Z" />
      <Path d="M 38 88 Q 36 90 36 96 Q 36 100 38 102 Q 41 103 44 102 Q 46 100 46 96 Q 46 90 44 88 Q 41 87 38 88 Z" />
      <Ellipse cx="41" cy="105" rx="4" ry="2" />
      <Path d="M 62 64 Q 65 66 65 75 Q 65 84 63 88 Q 59 89 55 88 Q 53 84 53 75 Q 53 66 55 64 Q 59 63 62 64 Z" />
      <Path d="M 62 88 Q 64 90 64 96 Q 64 100 62 102 Q 59 103 56 102 Q 54 100 54 96 Q 54 90 56 88 Q 59 87 62 88 Z" />
      <Ellipse cx="59" cy="105" rx="4" ry="2" />
    </G>
  );
}

export function MannequinBack() {
  return (
    <G fill={FILL} stroke={STROKE} strokeWidth={SW} strokeLinejoin="round" strokeLinecap="round">
      <Path d="M 50 6 Q 56 6 56 13 Q 56 19 50 19.5 Q 44 19 44 13 Q 44 6 50 6 Z" />
      <Rect x="47.5" y="19" width="5" height="2.5" rx="1" />
      <Path d="M 50 21.5 Q 38 22 32 26 Q 27 30 27 35 Q 27 42 28 48 Q 29 53 32 55 Q 38 57 50 57 Q 62 57 68 55 Q 71 53 72 48 Q 73 42 73 35 Q 73 30 68 26 Q 62 22 50 21.5 Z" />
      <Line x1="50" y1="23" x2="50" y2="56" strokeWidth="0.35" opacity="0.5" />
      <Path d="M 36 30 Q 38 36 40 40" fill="none" strokeWidth="0.3" opacity="0.5" />
      <Path d="M 64 30 Q 62 36 60 40" fill="none" strokeWidth="0.3" opacity="0.5" />
      <Path d="M 28 27 Q 22 28 20 33 Q 19 38 20 43 Q 21 47 24 47 Q 27 47 28 43 Q 29 38 28 33 Q 28 30 28 27 Z" />
      <Path d="M 21 47 Q 18 48 17 53 Q 16 58 17 62 Q 18 65 21 65 Q 24 65 25 62 Q 26 58 25 53 Q 24 49 22 47 Z" />
      <Path d="M 72 27 Q 78 28 80 33 Q 81 38 80 43 Q 79 47 76 47 Q 73 47 72 43 Q 71 38 72 33 Q 72 30 72 27 Z" />
      <Path d="M 79 47 Q 82 48 83 53 Q 84 58 83 62 Q 82 65 79 65 Q 76 65 75 62 Q 74 58 75 53 Q 76 49 78 47 Z" />
      <Path d="M 35 56 Q 35 60 39 63 Q 44 64 49 63 L 49 56" />
      <Path d="M 65 56 Q 65 60 61 63 Q 56 64 51 63 L 51 56" />
      <Path d="M 38 64 Q 35 66 35 75 Q 35 84 37 88 Q 41 89 45 88 Q 47 84 47 75 Q 47 66 45 64 Q 41 63 38 64 Z" />
      <Path d="M 38 88 Q 36 90 36 96 Q 36 100 38 102 Q 41 103 44 102 Q 46 100 46 96 Q 46 90 44 88 Q 41 87 38 88 Z" />
      <Ellipse cx="41" cy="105" rx="4" ry="2" />
      <Path d="M 62 64 Q 65 66 65 75 Q 65 84 63 88 Q 59 89 55 88 Q 53 84 53 75 Q 53 66 55 64 Q 59 63 62 64 Z" />
      <Path d="M 62 88 Q 64 90 64 96 Q 64 100 62 102 Q 59 103 56 102 Q 54 100 54 96 Q 54 90 56 88 Q 59 87 62 88 Z" />
      <Ellipse cx="59" cy="105" rx="4" ry="2" />
    </G>
  );
}
