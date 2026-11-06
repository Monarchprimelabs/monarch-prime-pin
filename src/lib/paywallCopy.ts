// Plan text for the paywall, built from StoreKit / Play prices. Pure and
// unit-tested: prices always come from the store (displayPrice), never from
// a hardcoded string, and trial wording appears only when the user is
// actually eligible (Guideline 3.1.2(c)).

export type PlanId = 'annual' | 'monthly' | 'lifetime';
type TFn = (key: string, vars?: Record<string, string | number>) => string;

/** An introductory price the store attaches to a subscription (e.g. $0.99 for the first month). */
export type IntroOffer = {
  displayPrice: string;
  mode: 'free-trial' | 'pay-as-you-go' | 'pay-up-front' | 'unknown';
  /** How many billing periods the intro price lasts (pay-as-you-go), or the length otherwise. */
  periods: number;
  unit: 'day' | 'week' | 'month' | 'year' | 'unknown';
};

export type PlanPrice = { displayPrice: string; price?: number | null; currency?: string | null; intro?: IntroOffer | null };

type StoreOffer = {
  type?: string | null; displayPrice?: string | null; paymentMode?: string | null;
  period?: { unit?: string | null; value?: number | null } | null; periodCount?: number | null;
};

/** The parts of a store product this reads: the offer list, and StoreKit's own intro fields. */
export type IntroSource = {
  subscriptionOffers?: StoreOffer[] | null;
  introductoryPriceIOS?: string | null;
  introductoryPricePaymentModeIOS?: string | null;
  introductoryPriceNumberOfPeriodsIOS?: string | null;
  introductoryPriceSubscriptionPeriodIOS?: string | null;
};

const MODES = ['free-trial', 'pay-as-you-go', 'pay-up-front'] as const;
const UNITS = ['day', 'week', 'month', 'year'] as const;
const pick = <T extends string>(list: readonly T[], value: string | null | undefined): T | 'unknown' =>
  (list as readonly string[]).includes(value ?? '') ? value as T : 'unknown';

/** The product's introductory offer (e.g. $0.99 for the first month), if it has one. */
export function introOffer(product: IntroSource | null | undefined): IntroOffer | null {
  const offer = (product?.subscriptionOffers ?? []).find(o => o.type === 'introductory' && !!o.displayPrice);
  if (offer?.displayPrice) {
    return {
      displayPrice: offer.displayPrice,
      mode: pick(MODES, offer.paymentMode),
      periods: Math.max(1, offer.periodCount ?? offer.period?.value ?? 1),
      unit: pick(UNITS, offer.period?.unit),
    };
  }
  if (product?.introductoryPriceIOS && product.introductoryPricePaymentModeIOS && product.introductoryPricePaymentModeIOS !== 'empty') {
    return {
      displayPrice: product.introductoryPriceIOS,
      mode: pick(MODES, product.introductoryPricePaymentModeIOS),
      periods: Math.max(1, Number(product.introductoryPriceNumberOfPeriodsIOS) || 1),
      unit: pick(UNITS, product.introductoryPriceSubscriptionPeriodIOS),
    };
  }
  return null;
}

/** "equivalent to $3.33/month" for the annual plan, or null if it can't be formatted. */
export function perMonth(plan: PlanPrice, locale: string): string | null {
  if (typeof plan.price !== 'number' || !plan.currency || plan.price <= 0) return null;
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(plan.price / 12);
  } catch {
    return null;
  }
}

export function planCopy(input: {
  plan: PlanId;
  price: PlanPrice;
  trialEligible: boolean;
  platform: 'ios' | 'android' | string;
  locale: string;
  t: TFn;
}): { priceLine: string; button: string; terms: string; showTrialTimeline: boolean } {
  const { plan, price, t } = input;
  const p = price.displayPrice;
  const cancelWhere = input.platform === 'android' ? t('paywall.cancelAndroid') : t('paywall.cancelIos');
  if (plan === 'lifetime') {
    return { priceLine: t('paywall.lifetimeLine', { price: p }), button: t('paywall.buyLifetime', { price: p }), terms: t('paywall.lifetimeTerms'), showTrialTimeline: false };
  }
  if (plan === 'monthly') {
    // A paid intro price (e.g. $0.99 for the first month), only for people the
    // store says can still get it (3.1.2: the offer and what follows, in full).
    const intro = input.trialEligible ? price.intro : null;
    if (intro && intro.mode !== 'free-trial' && intro.mode !== 'unknown') {
      const firstMonth = intro.unit === 'month' && intro.periods === 1;
      const offer = firstMonth
        ? t('paywall.monthlyIntroLine', { intro: intro.displayPrice, price: p })
        : t('paywall.monthlyIntroLineAny', { intro: intro.displayPrice, price: p });
      return {
        priceLine: offer,
        button: t('paywall.startMonthlyIntro', { intro: intro.displayPrice }),
        terms: `${offer} ${t('paywall.monthlyTerms', { price: p })} ${t('paywall.renewTerms')} ${cancelWhere}`,
        showTrialTimeline: false,
      };
    }
    return {
      priceLine: t('paywall.monthlyLine', { price: p }),
      button: t('paywall.subscribeMonthly', { price: p }),
      terms: `${t('paywall.monthlyTerms', { price: p })} ${t('paywall.renewTerms')} ${cancelWhere}`,
      showTrialTimeline: false,
    };
  }
  const monthly = perMonth(price, input.locale);
  const priceLine = monthly ? t('paywall.annualLineMonthly', { price: p, month: monthly }) : t('paywall.annualLine', { price: p });
  if (input.trialEligible) {
    return {
      priceLine,
      button: t('paywall.startTrial'),
      terms: `${t('paywall.trialTerms', { price: p })} ${t('paywall.renewTerms')} ${cancelWhere}`,
      showTrialTimeline: true,
    };
  }
  return {
    priceLine,
    button: t('paywall.subscribeAnnual', { price: p }),
    terms: `${t('paywall.annualTerms', { price: p })} ${t('paywall.renewTerms')} ${cancelWhere}`,
    showTrialTimeline: false,
  };
}
