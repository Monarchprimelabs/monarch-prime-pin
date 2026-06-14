import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getAppTransactionIOS,
  getAvailablePurchases,
  initConnection,
  Product,
  purchaseUpdatedListener,
  requestPurchase,
} from 'react-native-iap';

const KEY_ENTITLEMENT = '@mpp/pro_entitlement';
const LEGACY_STORAGE_KEYS = [
  '@mpp/user',
  '@mpp/onboarding_done',
  '@mpp/injections',
  '@mpp/schedules',
  '@mpp/inventory',
  '@mpp/templates',
];

export const LIFETIME_PRO_PRODUCT_ID = 'com.monarchprime.pin.pro.lifetime';
// Ship 1.1.0 while the app is still paid so buyers during the transition are
// also recognized as founding purchasers.
export const LAST_PAID_APP_VERSION = '1.1.0';

// Keep false until Lifetime Pro is configured and approved in App Store Connect.
export const MONETIZATION_ENABLED = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';

export type EntitlementSource = 'free' | 'early-access' | 'legacy-install' | 'paid-app' | 'lifetime';

type StoredEntitlement = {
  source: Exclude<EntitlementSource, 'free' | 'early-access'>;
  grantedAt: string;
  originalAppVersion?: string;
};

type EntitlementContextValue = {
  loading: boolean;
  hasPro: boolean;
  source: EntitlementSource;
  product: Product | null;
  monetizationEnabled: boolean;
  purchaseLifetime: () => Promise<void>;
  restorePurchases: () => Promise<boolean>;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const difference = (left[i] || 0) - (right[i] || 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

async function readStoredEntitlement(): Promise<StoredEntitlement | null> {
  const raw = await AsyncStorage.getItem(KEY_ENTITLEMENT);
  return raw ? JSON.parse(raw) : null;
}

async function saveEntitlement(entitlement: StoredEntitlement): Promise<void> {
  await AsyncStorage.setItem(KEY_ENTITLEMENT, JSON.stringify(entitlement));
}

async function hasLegacyLocalInstall(): Promise<boolean> {
  const values = await AsyncStorage.multiGet(LEGACY_STORAGE_KEYS);
  return values.some(([, value]) => value !== null);
}

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [stored, setStored] = useState<StoredEntitlement | null>(null);
  const [product, setProduct] = useState<Product | null>(null);

  const grant = async (source: StoredEntitlement['source'], originalAppVersion?: string) => {
    const entitlement: StoredEntitlement = {
      source,
      grantedAt: new Date().toISOString(),
      originalAppVersion,
    };
    setStored(entitlement);
    await saveEntitlement(entitlement);
  };

  const refreshStoreEntitlements = async (): Promise<boolean> => {
    const purchases = await getAvailablePurchases();
    if (purchases.some(purchase => purchase.productId === LIFETIME_PRO_PRODUCT_ID)) {
      await grant('lifetime');
      return true;
    }

    if (Platform.OS === 'ios') {
      const transaction = await getAppTransactionIOS();
      if (
        transaction?.originalAppVersion
        && compareVersions(transaction.originalAppVersion, LAST_PAID_APP_VERSION) <= 0
      ) {
        await grant('paid-app', transaction.originalAppVersion);
        return true;
      }
    }

    return false;
  };

  useEffect(() => {
    let active = true;
    let purchaseSubscription: { remove: () => void } | undefined;

    (async () => {
      try {
        const saved = await readStoredEntitlement();
        if (saved && active) setStored(saved);

        // This update is the first free-tier-aware build. Local data proves the
        // app existed before the transition, so preserve full access immediately.
        if (!saved && await hasLegacyLocalInstall()) {
          await grant('legacy-install');
        }

        await initConnection();

        purchaseSubscription = purchaseUpdatedListener(async purchase => {
          if (purchase.productId !== LIFETIME_PRO_PRODUCT_ID) return;
          await grant('lifetime');
          await finishTransaction({ purchase, isConsumable: false });
        });

        try {
          const products = await fetchProducts({ skus: [LIFETIME_PRO_PRODUCT_ID], type: 'in-app' });
          const lifetimeProduct = products.find(value => value.type === 'in-app') as Product | undefined;
          if (active) setProduct(lifetimeProduct || null);
        } catch {
          // The product will be unavailable until it exists in App Store Connect.
        }

        try {
          await refreshStoreEntitlements();
        } catch {
          // Stored and legacy-install entitlements keep working while offline.
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      purchaseSubscription?.remove();
      endConnection().catch(() => undefined);
    };
  }, []);

  const restorePurchases = async () => {
    await initConnection();
    return refreshStoreEntitlements();
  };

  const purchaseLifetime = async () => {
    if (!MONETIZATION_ENABLED) {
      throw new Error('Lifetime Pro purchases are not open yet.');
    }
    if (!product) {
      throw new Error('Lifetime Pro is temporarily unavailable. Please try again later.');
    }
    await requestPurchase({
      request: {
        apple: { sku: LIFETIME_PRO_PRODUCT_ID },
        google: { skus: [LIFETIME_PRO_PRODUCT_ID] },
      },
      type: 'in-app',
    });
  };

  const value = useMemo<EntitlementContextValue>(() => ({
    loading,
    hasPro: !!stored || !MONETIZATION_ENABLED,
    source: stored?.source || (MONETIZATION_ENABLED ? 'free' : 'early-access'),
    product,
    monetizationEnabled: MONETIZATION_ENABLED,
    purchaseLifetime,
    restorePurchases,
  }), [loading, product, stored]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value) throw new Error('useEntitlements must be used inside EntitlementProvider');
  return value;
}
