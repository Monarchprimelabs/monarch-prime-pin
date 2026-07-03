import React, { createContext, ReactNode, useContext } from 'react';

export const LIFETIME_PRO_PRODUCT_ID = 'com.monarchprime.pin.pro.lifetime';
export const FREE_INJECTION_LIMIT = 5;
export const LIFETIME_PRO_PRICE_LABEL = '$9.99';
export const LAST_PAID_APP_VERSION = '1.0.5';
export const MONETIZATION_ENABLED = false;

export type EntitlementSource = 'free' | 'early-access' | 'legacy-install' | 'paid-app' | 'lifetime';

type EntitlementContextValue = {
  loading: boolean;
  hasPro: boolean;
  source: EntitlementSource;
  product: { displayPrice?: string } | null;
  monetizationEnabled: boolean;
  purchaseLifetime: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const value: EntitlementContextValue = {
    loading: false,
    hasPro: true,
    source: 'early-access',
    product: null,
    monetizationEnabled: false,
    purchaseLifetime: async () => {
      throw new Error('Purchases are only available in the installed app.');
    },
    restorePurchases: async () => false,
  };

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value) throw new Error('useEntitlements must be used inside EntitlementProvider');
  return value;
}
