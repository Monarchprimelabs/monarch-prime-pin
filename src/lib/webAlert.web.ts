import { Alert, AlertButton } from 'react-native';

// React Native Web's Alert.alert does nothing, so on the web every message and
// confirmation in the app was silently skipped. This maps it onto the browser's
// own dialogs: one button (or none) -> alert; one choice plus Cancel -> confirm;
// several choices -> one confirm per choice until the person accepts one.
export function installWebAlert(): void {
  if (typeof window === 'undefined') return;
  Alert.alert = (title: string, message?: string, buttons?: AlertButton[]) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    const list = buttons ?? [];
    const cancel = list.find(b => b.style === 'cancel');
    const choices = list.filter(b => b.style !== 'cancel');
    if (choices.length === 0) {
      window.alert(text);
      cancel?.onPress?.();
      return;
    }
    if (choices.length === 1 && !cancel) {
      window.alert(text);
      choices[0].onPress?.();
      return;
    }
    for (const choice of choices) {
      const prompt = choices.length === 1 ? text : `${text}\n\nOK: ${choice.text ?? ''}`;
      if (window.confirm(prompt)) {
        choice.onPress?.();
        return;
      }
    }
    cancel?.onPress?.();
  };
}
