import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Product, ProductSubscription, Purchase } from 'expo-iap';
import { trackPurchase } from './funnel';
import {
  LEGACY_LIFETIME_ID, PREMIUM_ANNUAL_ID, PREMIUM_LIFETIME_ID, PREMIUM_MONTHLY_ID, SUBSCRIPTION_IDS,
} from './store/constants';
import {
  isPaidAppBuyer, isPremium, isSubscriptionProduct, PremiumSource, PremiumStatus, resolvePremium,
  StoredGrant, strongestState, SubscriptionState, toSubscriptionState,
} from './store/premium';

const KEY_ENTITLEMENT = '@mpp/pro_entitlement';
const KEY_FREEMIUM_SEEN = '@mpp/freemium_seen';
/** Last known subscription, so Premium keeps working offline until it expires. */
const KEY_SUBSCRIPTION_CACHE = '@mpp/subscription_cache_v1';
const LEGACY_STORAGE_KEYS = [
  '@mpp/user',
  '@mpp/onboarding_done',
  '@mpp/injections',
  '@mpp/schedules',
  '@mpp/inventory',
  '@mpp/templates',
];

// The 1.x product. Kept as LIFETIME_PRO_PRODUCT_ID while the 1.x upgrade
// screen still sells it; the 2.0 paywall (M4) replaces that screen.
export const LIFETIME_PRO_PRODUCT_ID = LEGACY_LIFETIME_ID;
export const FREE_INJECTION_LIMIT = 5;
export const LIFETIME_PRO_PRICE_LABEL = '$9.99';

// EAS profiles enable this for monetized builds.
export const MONETIZATION_ENABLED = process.env.EXPO_PUBLIC_MONETIZATION_ENABLED === 'true';

/** The 1.x names, still read by the upgrade and settings screens. */
export type EntitlementSource = 'free' | 'early-access' | 'legacy-install' | 'paid-app' | 'lifetime' | 'premium';

const LEGACY_SOURCE: Record<PremiumSource, EntitlementSource> = {
  none: 'free',
  legacyLifetime: 'lifetime',
  paidApp: 'paid-app',
  legacyInstall: 'legacy-install',
  lifetimePremium: 'premium',
  subscription: 'premium',
};

type StoredEntitlement = {
  source: 'legacy-install' | 'paid-app' | 'lifetime';
  grantedAt: string;
  originalAppVersion?: string;
};

type SubscriptionCache = { productId: string; expires: number | null; state: SubscriptionState };

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
  /** The 1.x $9.99 product, for the 1.x upgrade screen. */
  product: Product | null;
  products: PremiumProducts;
  /** Whether the annual free trial is offered; null while unknown. */
  trialEligible: boolean | null;
  monetizationEnabled: boolean;
  purchaseLifetime: () => Promise<void>;
  purchase: (productId: string) => Promise<void>;
  restorePurchases: () => Promise<boolean>;
  openRedeemCode: () => Promise<void>;
  manageSubscriptions: () => Promise<void>;
};

const EntitlementContext = createContext<EntitlementContextValue | null>(null);

type IapModule = typeof import('expo-iap');
let iapModulePromise: Promise<IapModule | null> | null = null;

async function getIapModule(): Promise<IapModule | null> {
  if (!iapModulePromise) {
    iapModulePromise = import('expo-iap').catch(() => null);
  }
  return iapModulePromise;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // corrupt value = nothing stored; the store check rebuilds it
  }
}

async function hasLegacyLocalInstall(): Promise<boolean> {
  const values = await AsyncStorage.multiGet(LEGACY_STORAGE_KEYS);
  return values.some(([, value]) => value !== null);
}

/** What the store says right now. Throws when the store can't be reached. */
async function readStore(iap: IapModule): Promise<{
  owned: { productId: string; revoked: boolean }[];
  state: SubscriptionState;
  subscription: SubscriptionCache | null;
  paidAppBuyer: boolean;
}> {
  const purchases: Purchase[] = await iap.getAvailablePurchases();
  const owned = purchases.map(p => ({
    productId: p.productId,
    revoked: !!(p as { revocationDateIOS?: number | null }).revocationDateIOS,
  }));

  let state: SubscriptionState = 'none';
  let subscription: SubscriptionCache | null = null;
  const active = await iap.getActiveSubscriptions([...SUBSCRIPTION_IDS]).catch(() => []);
  const current = active.find(s => s.isActive) ?? null;
  if (Platform.OS === 'ios') {
    // One status list covers the whole group (monthly and annual).
    const statuses = await iap.subscriptionStatusIOS(PREMIUM_ANNUAL_ID).catch(() => []);
    state = strongestState(statuses.map(s => toSubscriptionState(s.state)));
  } else if (current) {
    state = 'subscribed';
  }
  if (current) {
    subscription = { productId: current.productId, expires: current.expirationDateIOS ?? null, state };
  }

  let paidAppBuyer = false;
  if (Platform.OS === 'ios') {
    const appTransaction = await iap.getAppTransactionIOS().catch(() => null);
    paidAppBuyer = isPaidAppBuyer(appTransaction);
  }
  return { owned, state, subscription, paidAppBuyer };
}

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState<PremiumStatus>({ source: 'none', expires: null });
  const [legacyProduct, setLegacyProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<PremiumProducts>({ monthly: null, annual: null, lifetime: null });
  const [trialEligible, setTrialEligible] = useState<boolean | null>(null);
  const storedRef = useRef<StoredEntitlement | null>(null);

  const saveGrant = async (source: StoredEntitlement['source']) => {
    if (storedRef.current?.source === source) return;
    const entitlement: StoredEntitlement = { source, grantedAt: new Date().toISOString() };
    storedRef.current = entitlement;
    await AsyncStorage.setItem(KEY_ENTITLEMENT, JSON.stringify(entitlement));
  };

  /** Offline answer: saved grants, plus a cached subscription until it expires. */
  const resolveOffline = async () => {
    const cache = await readJson<SubscriptionCache>(KEY_SUBSCRIPTION_CACHE);
    const valid = !!cache && (cache.expires === null || cache.expires > Date.now());
    setPremium(resolvePremium({
      owned: [],
      subscriptionState: valid ? cache!.state : 'none',
      subscriptionExpires: valid ? cache!.expires : null,
      storedGrant: (storedRef.current?.source ?? null) as StoredGrant,
      paidAppBuyer: false,
    }));
  };

  const refresh = async (iap: IapModule): Promise<PremiumStatus> => {
    const store = await readStore(iap);
    const status = resolvePremium({
      owned: store.owned,
      subscriptionState: store.state,
      subscriptionExpires: store.subscription?.expires ?? null,
      storedGrant: (storedRef.current?.source ?? null) as StoredGrant,
      paidAppBuyer: store.paidAppBuyer,
    });
    // Founder grants are saved so they survive going offline, as in 1.x.
    if (status.source === 'legacyLifetime') await saveGrant('lifetime');
    if (status.source === 'paidApp') await saveGrant('paid-app');
    if (status.source === 'subscription' && store.subscription) {
      await AsyncStorage.setItem(KEY_SUBSCRIPTION_CACHE, JSON.stringify(store.subscription));
    } else {
      await AsyncStorage.removeItem(KEY_SUBSCRIPTION_CACHE);
    }
    setPremium(status);
    return status;
  };

  useEffect(() => {
    let active = true;
    let purchaseSubscription: { remove: () => void } | undefined;
    let appStateSubscription: { remove: () => void } | undefined;

    (async () => {
      try {
        storedRef.current = await readJson<StoredEntitlement>(KEY_ENTITLEMENT);
        const freemiumSeen = await AsyncStorage.getItem(KEY_FREEMIUM_SEEN);

        // 1.1.0 was the first free-tier-aware build. Local data proves the
        // app existed before that transition, so those users keep full access.
        if (!storedRef.current && !freemiumSeen && await hasLegacyLocalInstall()) {
          await saveGrant('legacy-install');
        }
        if (!freemiumSeen) await AsyncStorage.setItem(KEY_FREEMIUM_SEEN, 'true');
        await resolveOffline();

        const iap = await getIapModule();
        if (!iap) return;

        try {
          await iap.initConnection();

          // Every purchase is finished (lifetime products and subscriptions
          // alike are non-consumable), then the status is read from the store.
          purchaseSubscription = iap.purchaseUpdatedListener(async purchase => {
            const known = purchase.productId === LEGACY_LIFETIME_ID
              || purchase.productId === PREMIUM_LIFETIME_ID
              || isSubscriptionProduct(purchase.productId);
            if (!known) return;
            await iap.finishTransaction({ purchase, isConsumable: false });
            trackPurchase();
            await refresh(iap).catch(() => undefined);
          });

          const [inApp, subs] = await Promise.all([
            iap.fetchProducts({ skus: [LEGACY_LIFETIME_ID, PREMIUM_LIFETIME_ID], type: 'in-app' }).catch(() => []),
            iap.fetchProducts({ skus: [...SUBSCRIPTION_IDS], type: 'subs' }).catch(() => []),
          ]);
          const all = [...(inApp ?? []), ...(subs ?? [])] as (Product | ProductSubscription)[];
          const find = (id: string) => all.find(p => p.id === id) ?? null;
          if (active) {
            setLegacyProduct(find(LEGACY_LIFETIME_ID) as Product | null);
            setProducts({
              monthly: find(PREMIUM_MONTHLY_ID) as ProductSubscription | null,
              annual: find(PREMIUM_ANNUAL_ID) as ProductSubscription | null,
              lifetime: find(PREMIUM_LIFETIME_ID) as Product | null,
            });
          }
          if (Platform.OS === 'ios') {
            iap.isEligibleForIntroOfferIOS(PREMIUM_ANNUAL_ID)
              .then(eligible => { if (active) setTrialEligible(eligible); })
              .catch(() => { if (active) setTrialEligible(null); });
          }
        } catch {
          // Expo Go and unavailable store products land here. Saved grants
          // and the free tier keep working without a live store.
        }

        await refresh(iap).catch(() => undefined);

        // Renewals, refunds and expiries happen while the app is closed.
        appStateSubscription = AppState.addEventListener('change', next => {
          if (next === 'active') refresh(iap).catch(() => undefined);
        });
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
      purchaseSubscription?.remove();
      appStateSubscription?.remove();
      getIapModule().then(iap => iap?.endConnection().catch(() => undefined)).catch(() => undefined);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireStore = async (): Promise<IapModule> => {
    const iap = await getIapModule();
    if (!iap) throw new Error('Purchases require TestFlight or a development build.');
    return iap;
  };

  const purchase = async (productId: string) => {
    if (!MONETIZATION_ENABLED) throw new Error('Purchases are not open yet.');
    const iap = await requireStore();
    if (isSubscriptionProduct(productId)) {
      const product = productId === PREMIUM_MONTHLY_ID ? products.monthly : products.annual;
      if (!product) throw new Error('Premium is temporarily unavailable. Please try again later.');
      // Google Play needs an offer token; StoreKit applies the introductory
      // trial itself when the user is eligible.
      const offerToken = (product.subscriptionOffers ?? []).find(offer => !!offer.offerTokenAndroid)?.offerTokenAndroid;
      await iap.requestPurchase({
        request: {
          apple: { sku: productId },
          google: { skus: [productId], subscriptionOffers: offerToken ? [{ sku: productId, offerToken }] : [] },
        },
        type: 'subs',
      });
      return;
    }
    const available = productId === LEGACY_LIFETIME_ID ? legacyProduct : products.lifetime;
    if (!available) throw new Error('This purchase is temporarily unavailable. Please try again later.');
    await iap.requestPurchase({
      request: { apple: { sku: productId }, google: { skus: [productId] } },
      type: 'in-app',
    });
  };

  const restorePurchases = async () => {
    const iap = await requireStore();
    await iap.initConnection();
    await iap.restorePurchases().catch(() => undefined);
    return isPremium(await refresh(iap));
  };

  const openRedeemCode = async () => {
    const iap = await requireStore();
    await iap.openRedeemOfferCode();
    await refresh(iap).catch(() => undefined);
  };

  const manageSubscriptions = async () => {
    const iap = await requireStore();
    if (Platform.OS === 'ios') await iap.showManageSubscriptionsIOS();
    else await iap.deepLinkToSubscriptions();
  };

  const value = useMemo<EntitlementContextValue>(() => ({
    loading,
    hasPro: isPremium(premium) || !MONETIZATION_ENABLED,
    source: MONETIZATION_ENABLED ? LEGACY_SOURCE[premium.source] : 'early-access',
    premium,
    product: legacyProduct,
    products,
    trialEligible,
    monetizationEnabled: MONETIZATION_ENABLED,
    purchaseLifetime: () => purchase(LEGACY_LIFETIME_ID),
    purchase,
    restorePurchases,
    openRedeemCode,
    manageSubscriptions,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [loading, premium, legacyProduct, products, trialEligible]);

  return <EntitlementContext.Provider value={value}>{children}</EntitlementContext.Provider>;
}

export function useEntitlements() {
  const value = useContext(EntitlementContext);
  if (!value) throw new Error('useEntitlements must be used inside EntitlementProvider');
  return value;
}
