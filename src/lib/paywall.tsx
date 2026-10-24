import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Feature } from './featureGate';

/** Where the paywall was opened from (docs/PRIME_PIN_V2_HANDOFF.md, PAYWALL). */
export type PaywallPlacement =
  | { kind: 'lockedFeature'; feature: Feature }
  | { kind: 'thirdPlan' }
  | { kind: 'settings' };

type PaywallContextValue = { openPaywall: (placement: PaywallPlacement) => void };

const PaywallContext = createContext<PaywallContextValue | null>(null);

/** Hosts the one paywall modal, so any screen can open it. */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const [placement, setPlacement] = useState<PaywallPlacement | null>(null);
  const openPaywall = useCallback((next: PaywallPlacement) => setPlacement(next), []);
  const value = useMemo(() => ({ openPaywall }), [openPaywall]);
  // Required lazily: the screen's StyleSheets must load after the theme.
  const { UpgradeScreen } = require('../screens/UpgradeScreen');
  return (
    <PaywallContext.Provider value={value}>
      {children}
      <Modal visible={!!placement} animationType="slide" onRequestClose={() => setPlacement(null)}>
        <SafeAreaProvider>
          {placement && <UpgradeScreen onClose={() => setPlacement(null)} />}
        </SafeAreaProvider>
      </Modal>
    </PaywallContext.Provider>
  );
}

export function usePaywall() {
  const value = useContext(PaywallContext);
  if (!value) throw new Error('usePaywall must be used inside PaywallProvider');
  return value;
}
