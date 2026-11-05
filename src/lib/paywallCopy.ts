// Plan text for the paywall, built from StoreKit / Play prices. Pure and
// unit-tested: prices always come from the store (displayPrice), never from
// a hardcoded string, and trial wording appears only when the user is
// actually eligible (Guideline 3.1.2(c)).

export type PlanId = 'annual' | 'monthly' | 'lifetime';
type TFn = (key: string, vars?: Record<string, string | number>) => string;

export type PlanPrice = { displayPrice: string; price?: number | null; currency?: string | null };

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
