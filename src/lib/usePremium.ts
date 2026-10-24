import { useCallback } from 'react';
import { useAuth } from './auth';
import { useEntitlements } from './entitlements';
import { allows as gateAllows, Feature } from './featureGate';
import { useFounder } from './founders';

/** One hook for every gate: Premium (any source), founder status, and allows(). */
export function usePremium() {
  const { hasPro } = useEntitlements();
  const { status: founder } = useFounder();
  const { user } = useAuth();
  const premium = hasPro || !!user?.isDeveloper;
  const allows = useCallback((feature: Feature) => gateAllows(feature, { premium, founder }), [premium, founder]);
  return { premium, founder, allows };
}
