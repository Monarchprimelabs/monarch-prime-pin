# Codex audit: Monarch Prime Pin 2.0

The 15-item checklist from `docs/PRIME_PIN_V2_HANDOFF.md`, mapped to this
Expo / React Native codebase. Status is from the M8 pass on
`feature/premium-v2` (Oct 24, 2026). "Mac" items need Xcode or a device;
Codex runs them there.

| # | Check | Status | Where / how verified |
|---|---|---|---|
| 1 | No remote config, feature flags, network calls or date-based unlocks, except the store | Pass | `grep -rn "fetch(\|axios\|XMLHttpRequest\|WebSocket" src`: only the dormant Supabase photo upload in `storage.ts`, which never runs because `SUPABASE_CONFIGURED` is false (placeholder keys in `src/lib/supabase.ts`). `EXPO_PUBLIC_MONETIZATION_ENABLED` is a build-time constant in `eas.json`, not remote. No date unlocks: `PAID_APP_FREE_DATE` and `FOUNDER_CUTOFF` are `null` until the owner sets them, and they only identify past customers. |
| 2 | Every Feature is visible with a lock when free; nothing hidden | Pass | `allows()` in `src/lib/featureGate.ts`; locks via `PremiumBadge` / `PremiumLockCard`. Gated in UI: Labs (Tools), 90d/All heat map (Home), weekly and per-compound charts, PDF, Insights, Health trends (Reports), photo compare (History), third plan (Protocols), monthly report switch (Settings > Notifications). `heatmapReplay90Day`, `extraThemes`, `statsCardNoWatermark` and `cloudSync` are defined for later but nothing exists behind them, so nothing is hidden. `labReminders` lives inside Labs; `fullWeeklySummary` only changes the Sunday notification wording. |
| 3 | No string recommends an amount | Pass | `src/lib/__tests__/insights.test.ts` fails on advice words in en/es/pt. A manual grep for dose/dosis/recommend/recomend/should/deberías finds only field labels for what the user records ("DOSE", "Latest recorded dose") and statements that the app does *not* recommend amounts (`legal.p4`). |
| 4 | Worksheet: no presets, empty fields, notice, not gated, no runtime toggle | Pass | `ToolsScreen.tsx` worksheet: empty fields, permanent notice, "Show math", no Premium check. The Option B build removes it at build time (`feature/no-worksheet`), not at runtime. |
| 5 | Legacy lifetime ID honored; originalAppVersion not used | Pass | `LEGACY_LIFETIME_ID = 'com.monarchprime.pin.pro.lifetime'` resolves to `legacyLifetime` first in `resolvePremium` (`src/lib/store/premium.ts`, tested). The only `originalAppVersion` left is an optional field in the 1.x stored-grant JSON type, never read. |
| 6 | Purchase listener at launch; every transaction finished | Pass (Mac to confirm) | `purchaseUpdatedListener` registered in the provider's launch effect; `finishTransaction` for every known product before refresh (`entitlements.native.tsx`). StoreKit-session tests run on a Mac against `storekit/Products.storekit`. |
| 7 | Paywall disclosures | Pass (Mac UI test) | `PaywallScreen.tsx`: `displayPrice` only, renewal terms, trial text and timeline only when `isEligibleForIntroOfferIOS`, Restore, Redeem Code, Terms, Privacy (once `PRIVACY_URL` is set), Manage Subscription, close button always shown. Copy rules unit-tested in `paywall.test.ts`. |
| 8 | HealthKit data never in iCloud, backups or logs | Pass | `health.ios.ts` only stores the on/off and asked flags; values stay in memory. `backup.ts` has no Health fields. No `console.log` of Health values. No iCloud entitlement. |
| 9 | No crash when products fail to load | Pass (Mac to confirm offline) | Each `fetchProducts` call has a `.catch(() => [])`; the paywall shows "couldn't load" with Retry; the app works without the store, and cached subscriptions keep working offline until they expire. |
| 10 | New strings localized | Pass | en, es **and** pt; `node scripts/check-i18n.js`: 0 problems. iOS permission strings in `locales/es.json` and `locales/pt.json`. |
| 11 | No network metrics or analytics SDKs | Pass | `src/lib/localMetrics.ts` is AsyncStorage-only and shown in Settings > Access > Your activity. No analytics packages in `package.json`. App Privacy stays "Data Not Collected". |
| 12 | Promotional notifications only behind "News and offers" | Pass (by absence) | The app sends no promotional notifications, so there is no "News and offers" switch to turn on (`src/lib/notify/prefs.ts`). If one is ever added, it needs that opt-in, off by default (4.5.4). |
| 13 | Founder status: computed once, stored, never from originalAppVersion, production-only date check | Pass | `founderEvidence.ts` snapshots 1.x data before any 2.0 write (first thing in `App.tsx`) and keeps a Keychain copy (`expo-secure-store`); `founderRules.ts` ignores non-production AppTransactions; `higherStatus` never downgrades. Tested in `founders.test.ts`. |
| 14 | Notification copy: no dosing language, no vendor names | Pass | `notify.*`, `proto.notif*`, `vial.alert*`, `labs.*` reminder strings never name a compound, vial label or vendor (lock screens are visible to others). |
| 15 | No hidden debug screens in Release | Pass | The developer sign-in (`SignInScreen.tsx`), the founder-state preview (`founders.tsx`, Settings) and the funnel card (shown only to the developer user) all depend on `__DEV__`, which is false in Release builds. |

## Handoff test cases

| Case | Where |
|---|---|
| 1 unlimited free logging | 5-log wall removed (`LogInjectionScreen`, `freeTier.test.ts`) |
| 2-8 StoreKit purchase, trial, expiry, refund, legacy and new lifetime, restore | `premium.ts` resolution in Jest; StoreKit-session run on a Mac |
| 9 every Feature false for free, true for Premium | `featureGate.test.ts` |
| 10 worksheet reachable while free | `featureGate.test.ts` (no worksheet gate exists) |
| 11 insight forbidden words | `insights.test.ts` |
| 12 strings for all new keys | `scripts/check-i18n.js` (en, es, pt) |
| 13-14 founder detection and founder features | `founders.test.ts` |
| 15 quiet hours, daily cap, no permission request | `notifyPlan.test.ts`, `notifyScheduler.test.ts` |
| 16 win-back | Deferred: offers can only be created after the subscriptions are approved (`docs/V2_PLAN.md` section 8) |
| 17 lapsed Premium keeps labs and photos | `lapsed.test.ts` |
| 18 auto-paywall cap | `paywall.test.ts` |

## Known deviations from the handoff

- **Widgets** move to 2.1 (owner decision).
- **"Log it"** opens the app to a one-tap save; **"Snooze 1 h"** also opens the app briefly. Expo can't reliably run JS for a background notification action.
- **Vial running low** uses the existing run-out projection (a week left, then nearly out), not an editable "N entries" threshold, and its text doesn't name the vial.
- **Monthly recap paywall** has a context line but no blurred PDF preview.
- **Win-back "Welcome back" state** and StoreKit messages: see `docs/V2_PLAN.md` section 8.
