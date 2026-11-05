import React from 'react';
import { ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { READABLE_MAX_WIDTH, WIDE_MAX_WIDTH, useWideLayout } from '../lib/layout';

// Two columns with a centre gutter. On the iPhone Duo the fold runs down the
// middle of the inner screen, so the gutter keeps content off the crease.
export function TwoColumn({ left, right, leftFlex = 1, rightFlex = 1, gap }: {
  left: React.ReactNode;
  right: React.ReactNode;
  leftFlex?: number;
  rightFlex?: number;
  /** Space between items inside each column, for lists laid out with `gap`. */
  gap?: number;
}) {
  return (
    <View style={s.row}>
      <View style={[s.col, { flex: leftFlex, gap }]}>{left}</View>
      <View style={s.gutter} />
      <View style={[s.col, { flex: rightFlex, gap }]}>{right}</View>
    </View>
  );
}

/** Flattens fragments so their children count as separate items. */
function items(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap(child =>
    React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment ? items(child.props.children) : [child]);
}

/**
 * A stack of cards that becomes two columns on wide windows, one each side
 * of the centre gutter (and the Duo's fold). "alternate" fills left, right,
 * left… like a grid; "halves" keeps reading order, first half on the left;
 * "lead" puts the first item on the left and the rest on the right.
 */
export function SplitColumns({ children, mode = 'alternate', gap }: { children: React.ReactNode; mode?: 'alternate' | 'halves' | 'lead'; gap?: number }) {
  const wide = useWideLayout();
  const list = items(children);
  if (!wide || list.length < 2) return <>{children}</>;
  const mid = Math.ceil(list.length / 2);
  // "lead": the first item (say, a calendar) on the left, the rest beside it.
  const left = mode === 'lead' ? list.slice(0, 1) : mode === 'halves' ? list.slice(0, mid) : list.filter((_, i) => i % 2 === 0);
  const right = mode === 'lead' ? list.slice(1) : mode === 'halves' ? list.slice(mid) : list.filter((_, i) => i % 2 === 1);
  return <TwoColumn left={<>{left}</>} right={<>{right}</>} gap={gap} />;
}

/** The full two-column width on wide windows, for headers and bars above SplitColumns. */
export function wideColumn(wide: boolean): ViewStyle | undefined {
  return wide ? { width: '100%', maxWidth: WIDE_MAX_WIDTH, alignSelf: 'center' } : undefined;
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
export function ReadableScrollView({ contentContainerStyle, fullWidth, split, children, ...props }: React.ComponentProps<typeof ScrollView> & {
  /** For screens that lay out their own columns (SplitColumns) on wide windows. */
  fullWidth?: boolean;
  /**
   * On wide windows, lay the cards out in two columns at the centre (the
   * Duo's fold) instead of one column down the middle, keeping reading order.
   */
  split?: boolean;
}) {
  // React 19 passes `ref` through props, so it reaches the ScrollView unchanged.
  const wide = useWideLayout();
  const columns = wide && split && !props.horizontal && items(children).length >= 2;
  const readable = props.horizontal || fullWidth || columns ? undefined : readableColumn(wide);
  return (
    <ScrollView {...props} contentContainerStyle={[contentContainerStyle, readable]}>
      {columns ? <SplitColumns mode="halves">{children}</SplitColumns> : children}
    </ScrollView>
  );
}
