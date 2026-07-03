import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// Centralized, never-throwing haptic cues. Used sparingly — success on
// meaningful completions, a light tap on small interactions — so the
// feedback stays premium rather than noisy.

const canVibrate = Platform.OS === 'ios' || Platform.OS === 'android';

export function hapticSuccess(): void {
  if (!canVibrate) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function hapticWarning(): void {
  if (!canVibrate) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
}

export function hapticTap(): void {
  if (!canVibrate) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}
