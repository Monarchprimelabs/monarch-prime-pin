import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { READABLE_MAX_WIDTH, WIDE_MAX_WIDTH, useWideLayout } from '../lib/layout';

// Two columns with a centre gutter. On the iPhone Duo the fold runs down the
// middle of the inner screen, so the gutter keeps content off the crease.
export function TwoColumn({ left, right, leftFlex = 1, rightFlex = 1 }: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftFlex?: number;
  rightFlex?: number;
}) {
  return (
    <View style={s.row}>
      <View style={[s.col, { flex: leftFlex }]}>{left}</View>
      <View style={s.gutter} />
      <View style={[s.col, { flex: rightFlex }]}>{right}</View>
    </View>
  );
}

/** Centres a single column at a readable width on wide windows. */
export function readableColumn(wide: boolean): ViewStyle | undefined {
  return wide ? { width: '100%', maxWidth: READABLE_MAX_WIDTH, alignSelf: 'center' } : undefined;
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center' },
  col: { minWidth: 0 },
  gutter: { width: 28 },
});

/**
 * A ScrollView whose content stays at a readable width on wide windows.
 * Horizontal scrollers are left alone. Screens import it as `ScrollView`.
 */
export function ReadableScrollView({ contentContainerStyle, ...props }: React.ComponentProps<typeof ScrollView>) {
  // React 19 passes `ref` through props, so it reaches the ScrollView unchanged.
  const wide = useWideLayout();
  const readable = props.horizontal ? undefined : readableColumn(wide);
  return <ScrollView {...props} contentContainerStyle={[contentContainerStyle, readable]} />;
}
