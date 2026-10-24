import React, { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import { Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Feature } from './featureGate';
import type { AutoPlacement } from './paywallCap';
import { claimAutoPaywall } from './paywallAuto';
import { useEntitlements } from './entitlements';

/** Where the paywall was opened from (docs/PRIME_PIN_V2_HANDOFF.md, PAYWALL). */
export type PaywallPlacement =
  | { kind: 'lockedFeature'; feature: Feature }
  | { kind: 'thirdPlan' }
  | { kind: 'labsTab' }
  | { kind: 'settings' }
  | { kind: AutoPlacement };

type PaywallContextValue = {
  /** User-initiated: always opens. */
  openPaywall: (placement: PaywallPlacement) => void;
  /** Automatic: opens only within the caps (at most once a week, never mid-log). */
  maybeAutoPaywall: (placement: AutoPlacement, month?: string) => Promise<void>;
};

const PaywallContext = createContext<PaywallContextValue | null>(null);

/** Hosts the one paywall modal, so any screen can open it. */
export function PaywallProvider({ children }: { children: ReactNode }) {
  const { hasPro } = useEntitlements();
  const [placement, setPlacement] = useState<PaywallPlacement | null>(null);
  const openPaywall = useCallback((next: PaywallPlacement) => setPlacement(next), []);
  const maybeAutoPaywall = useCallback(async (next: AutoPlacement, month?: string) => {
    if (await claimAutoPaywall(next, hasPro, month)) setPlacement({ kind: next });
  }, [hasPro]);
  const value = useMemo(() => ({ openPaywall, maybeAutoPaywall }), [openPaywall, maybeAutoPaywall]);
  // Required lazily: the screen's StyleSheets must load after the theme.
  const { PaywallScreen } = require('../screens/PaywallScreen');
  return (
    <PaywallContext.Provider value={value}>
      {children}
      <Modal visible={!!placement} animationType="slide" onRequestClose={() => setPlacement(null)}>
        <SafeAreaProvider>
          {placement && <PaywallScreen onClose={() => setPlacement(null)} />}
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
