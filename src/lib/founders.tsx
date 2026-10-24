import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { useEntitlements } from './entitlements';
import { FOUNDER_CUTOFF } from './store/constants';
import { isPaidFounderSource } from './store/premium';
import { decideFounder, downloadedBefore2, FounderStatus } from './founderRules';
import { KEY_EVIDENCE, secureGet, secureSet } from './founderEvidence';

declare const __DEV__: boolean;

const KEY_STATUS = '@mpp/founder_status_v1';
// Keychain copy (the handoff's "Keychain + UserDefaults"); AsyncStorage mirrors it.
const SECURE_STATUS = 'com.monarchprime.pin.founder.status';

const isStatus = (value: string | null): value is FounderStatus =>
  value === 'none' || value === 'freeFounder' || value === 'paidFounder';

type FounderContextValue = {
  loading: boolean;
  status: FounderStatus;
  /** Development builds only: preview each founder state. */
  setDebugStatus?: (status: FounderStatus | null) => void;
};

const FounderContext = createContext<FounderContextValue | null>(null);

export function FounderProvider({ children }: { children: ReactNode }) {
  const { premium, loading: premiumLoading } = useEntitlements();
  const [status, setStatus] = useState<FounderStatus>('none');
  const [loading, setLoading] = useState(true);
  const [debugStatus, setDebugStatus] = useState<FounderStatus | null>(null);

  useEffect(() => {
    if (premiumLoading) return;
    let active = true;
    (async () => {
      const savedValue = (await secureGet(SECURE_STATUS)) ?? (await AsyncStorage.getItem(KEY_STATUS));
      const stored = isStatus(savedValue) ? savedValue : null;
      const had1xData = (await AsyncStorage.getItem(KEY_EVIDENCE)) === '1';

      let downloadedBefore: boolean | null = null;
      const needsDateCheck = stored !== 'paidFounder' && stored !== 'freeFounder' && !had1xData;
      if (needsDateCheck && Platform.OS === 'ios') {
        try {
          const iap = await import('expo-iap');
          downloadedBefore = downloadedBefore2(await iap.getAppTransactionIOS(), FOUNDER_CUTOFF);
        } catch {
          downloadedBefore = null; // offline or unavailable: try again next launch
        }
      } else if (needsDateCheck) {
        // Android launches with 2.0, so no Android user predates it.
        downloadedBefore = false;
      }

      const decision = decideFounder({
        stored,
        had1xData,
        paidFounderPurchase: isPaidFounderSource(premium.source),
        downloadedBefore,
      });
      if (decision.settled && decision.status !== stored) {
        await AsyncStorage.setItem(KEY_STATUS, decision.status);
        await secureSet(SECURE_STATUS, decision.status);
      }
      if (active) {
        setStatus(decision.status);
        setLoading(false);
      }
    })().catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [premiumLoading, premium.source]);

  const value = useMemo<FounderContextValue>(() => ({
    loading,
    status: (__DEV__ && debugStatus) || status,
    setDebugStatus: __DEV__ ? setDebugStatus : undefined,
  }), [loading, status, debugStatus]);

  return <FounderContext.Provider value={value}>{children}</FounderContext.Provider>;
}

export function useFounder() {
  const value = useContext(FounderContext);
  if (!value) throw new Error('useFounder must be used inside FounderProvider');
  return value;
}
