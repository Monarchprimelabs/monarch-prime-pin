import React, { createContext, ReactNode, useContext } from 'react';
import { LEGACY_LIFETIME_ID } from './store/constants';
import type { Product, ProductSubscription } from 'expo-iap';
import type { PremiumStatus } from './store/premium';

// Web and tests: no store, every tool open. Mirrors entitlements.native.tsx.
export const LIFETIME_PRO_PRODUCT_ID = LEGACY_LIFETIME_ID;
export const FREE_INJECTION_LIMIT = 5;
export const LIFETIME_PRO_PRICE_LABEL = '$9.99';
export const MONETIZATION_ENABLED = false;

export type EntitlementSource = 'free' | 'early-access' | 'legacy-install' | 'paid-app' | 'lifetime' | 'premium';

export type PremiumProducts = {
  monthly: ProductSubscription | null;
  annual: ProductSubscription | null;
  lifetime: Product | null;
};

type EntitlementContextValue = {
  loading: boolean;
  hasPro: boolean;
  source: EntitlementSource;
  premium: PremiumStatus;
  product: { displayPrice?: string } | null;
  products: PremiumProducts;
  trialEligible: boolean | null;
  monetizationEnabled: boolean;
  purchaseLifetime: () => Promise<void>;
  purchase: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  openRedeemCode: () => Promise<void>;
  manageSubscriptions: () => Promise<void>;
  subscriptionProductId: string | null;
  lapsed: boolean;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

const unavailable = async () => {
  throw new Error('Purchases are only available in the installed app.');
};

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const value: EntitlementContextValue = {
    loading: false,
    hasPro: true,
    source: 'early-access',
    premium: { source: 'none', expires: null },
    product: null,
    products: { monthly: null, annual: null, lifetime: null },
    trialEligible: null,
    monetizationEnabled: false,
    purchaseLifetime: unavailable,
    purchase: unavailable,
    restorePurchases: async () => false,
    openRedeemCode: unavailable,
    manageSubscriptions: unavailable,
    subscriptionProductId: null,
    lapsed: false,
  };

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value) throw new Error('useEntitlements must be used inside EntitlementProvider');
  return value;
}
