import { useWindowDimensions } from 'react-native';

// Layout follows the app's window, never the device model: the iPhone Duo's
// inner screen, an iPad, iPad Split View and Stage Manager all report a wide
// window, and the Duo's cover screen reports a phone-sized one.
export const WIDE_MIN_WIDTH = 700;

/** Single-column screens stay readable on wide windows instead of stretching. */
export const READABLE_MAX_WIDTH = 680;

/** Two-column screens stop growing past this, so very large iPads keep margins. */
export const WIDE_MAX_WIDTH = 1180;

export function isWideWidth(width: number): boolean {
  return width >= WIDE_MIN_WIDTH;
}

export function useWideLayout(): boolean {
  return isWideWidth(useWindowDimensions().width);
}
