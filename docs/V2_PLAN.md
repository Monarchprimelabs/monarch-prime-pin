# Monarch Prime Pin 2.0: M0 recon and plan

Step M0 of `docs/PRIME_PIN_V2_HANDOFF.md`: recon and plan, no code changes.
Branch `feature/premium-v2`, cut from `ios-duo-ipad` so 2.0 also carries
Expo SDK 58, the iPad and iPhone Duo layouts and the free-plan work. Written
Oct 24, 2026. Nothing below is built until the owner approves.

## 1. Where the handoff doesn't match this codebase

| Handoff assumes | Actual | What the plan does |
| --- | --- | --- |
| SwiftUI app, SwiftData or Core Data, Swift files (`EntitlementManager.swift`...) | Expo SDK 58 / React Native 0.88 / TypeScript. Data is AsyncStorage (`src/lib/storage.ts`). iOS project is generated at build time. | Same design, in TypeScript modules: `src/lib/store/*`, `src/lib/founders.ts`, `src/lib/featureGate.ts`. |
| StoreKit 2 Swift APIs, `SKTestSession` tests | Purchases go through `expo-iap` (StoreKit 2 / Play Billing). It exposes subscriptions, `isEligibleForIntroOfferIOS`, `subscriptionStatusIOS`, `currentEntitlementIOS`, `getAppTransactionIOS` (with `originalPurchaseDate` and `environment`), `openRedeemOfferCode`, `showManageSubscriptionsIOS`, a billing-issue listener and win-back types. | Logic is pure TypeScript with Jest tests against a fake store. `Products.storekit` is added for Xcode testing; the StoreKit-session tests run on a Mac (Codex), not in CI. |
| "The app was always free" | **It wasn't.** 1.0.5 (build 9) was a paid download; builds 10+ are free with the $9.99 IAP. Paid-download buyers get Pro today through `originalAppVersion <= 9` (`src/lib/entitlements.native.tsx`), the check the handoff bans. | Replace that check with `AppTransaction.originalPurchaseDate` before the date the price went to Free (production only). Their already-saved `paid-app` entitlement keeps working. Owner confirms the date. |
| English and Spanish | English, Spanish **and Portuguese** (`src/lib/i18n.tsx`, parity checked by `scripts/check-i18n.js`). | Every new string in all three. |
| Free: 2 active plans | Unreleased branch has 1 free plan. | Change to 2, per the handoff. |
| Worksheet is free | Worksheet is Pro today (`ToolsScreen.tsx`). | Ungate it (M5). |
| Widgets in 2.0 | The 1.7.0 widget failed on device three builds running and was removed (`docs/RELEASING.md`). | See decision 6. |
| "Log it" runs in the background from the notification | Expo notification actions can't reliably run app code without opening the app. | "Log it" opens straight to a one-tap save of that planned entry. Snooze works in the background. |
| Compile-time `REMOVE_WORKSHEET` | No Xcode configurations in an Expo app. | An EAS build profile sets `EXPO_PUBLIC_REMOVE_WORKSHEET=true`; the worksheet is loaded with a conditional `require`, which Metro and the minifier drop from that bundle. A script checks the bundle for worksheet strings. |

## 2. 1.x data that marks a free founder (check before any 2.0 write)

AsyncStorage keys any 1.x version writes: `@mpp/user`, `@mpp/onboarding_done`,
`@mpp/onboarding_prefs`, `@mpp/injections`, `@mpp/schedules`,
`@mpp/inventory`, `@mpp/templates`, `@mpp/protocols`, `@mpp/vials`,
`@mpp/dose_skips`, `@mpp/freemium_seen`, `@mpp/pro_entitlement`,
`@mpp/successful_save_count`, `@mpp/funnel_stats`, `@mpp/theme`,
`@mpp/colorway`, `@mpp/language`, `@mpp/app_lock_enabled`,
`@mpp/heatmap_half_life`, `@mpp/worksheet_inputs`, `@mpp/last_backup_at`,
`@mpp/health_read_enabled`, `@mpp/health_read_asked_v2`,
`@mpp/reminder_map`, `@mpp/review_requested`. Photos live in
`Documents/photos`.

## 3. Existing entitlements to honor

| Source today | Who | 2.0 status (proposed) |
| --- | --- | --- |
| `lifetime`: IAP `com.monarchprime.pin.pro.lifetime` ($9.99) | Lifetime Pro buyers | Paid founder: Premium for life (`LEGACY_LIFETIME_ID`) |
| `paid-app`: bought the 1.0.5 paid download | Original buyers | Paid founder: Premium for life (decision 1) |
| `legacy-install`: had data before the free tier (1.1.0) | Early users granted Pro | Keep everything they have now (decision 2) |
| `free` | Everyone else on 1.x | Free founder |

## 4. FOUNDER_FREE_FEATURES draft (what 1.x free users can use today)

Home and stats, the site heat map with every range (7d / 30d / 90d / All:
full history), History log list, Log This Again, share card, CSV export,
backup/restore, app lock, Apple Health weight, body fat and steps, every
theme and language (Settings has no Pro gates). The 5-log cap goes away for everyone, so it
isn't listed. Pro-only in 1.x and **not** founder-free: calendar, photo
gallery, Reports, protocols, vials, worksheet, older tools. In 2.0 the
worksheet and 2 plans become free for everyone anyway.

## 5. Files to add or touch

- **Add:** `src/lib/store/constants.ts` (product IDs, `LEGACY_LIFETIME_ID`,
  `FOUNDER_CUTOFF`, `PAID_APP_FREE_DATE`, `FOUNDER_CODE`, URLs, all with TODO),
  `src/lib/store/entitlements.tsx` (replaces `entitlements*.tsx`),
  `src/lib/founders.ts`, `src/lib/featureGate.ts`,
  `src/components/PremiumGated.tsx`, `src/screens/PaywallScreen.tsx`
  (replaces `UpgradeScreen.tsx`), `src/components/FounderSheet.tsx`,
  `src/lib/notificationScheduler.ts`, `src/lib/localMetrics.ts`,
  `src/lib/insights.ts`, `src/lib/labs/*` and `src/screens/LabsScreen.tsx`,
  `src/screens/HealthTrendsScreen.tsx`, `ios/Products.storekit` (via a config
  plugin), tests for each, and docs: `REVIEW_NOTES.md`, `CODEX_AUDIT.md`,
  `later-phases.md`, `cloudsync-plan.md`, `CHANGELOG.md`.
- **Touch:** `entitlements.native.tsx` / `.tsx` (replaced), `UpgradeScreen`,
  `LogInjectionScreen` and `DashboardScreen` (drop the 5-log wall),
  `ToolsScreen` (ungate and reword worksheet), `HistoryScreen`,
  `AnalyticsScreen`, `SettingsScreen` (Premium, Notifications, founder
  badge), `ProtocolsScreen` + `freeTier.ts` (2 plans),
  `protocolReminders.native.ts`, `health.ios.ts` (expanded types),
  `backup.ts` and `csvRows.ts` (labs), `i18n.tsx`, `app.json` (Health usage
  strings), `eas.json` (no-worksheet profile).

## 6. Decisions for the owner

1. **1.0.5 paid-download buyers:** treat them as paid founders (Premium for
   life)? Recommended yes. Needs the date the price went to Free from App
   Store Connect (Pricing history); the repo suggests about June 19, 2026.
2. **`legacy-install` users** (had data before 1.1.0, given Pro for free):
   keep them at Premium? Recommended yes: they have Pro now, and taking it
   away invites complaints.
3. **1.9.0:** ship the iPad/Duo build first, or fold it into 2.0? Folding
   means one review and the founder stamp happens on 2.0's first launch as
   planned. Shipping 1.9 first gets the Duo out sooner; founder detection still
   works because it reads 1.x data.
4. **Android:** launching Sunday with the $9.99 Lifetime Pro makes those
   buyers paid founders on Android too (Play purchases are separate). Or hold
   Android for 2.0 so it launches with subscriptions.
5. **Product IDs:** `com.monarchprime.pin.premium.monthly`, `.annual`,
   `.lifetime` match the bundle ID. Legacy ID found in code:
   `com.monarchprime.pin.pro.lifetime`. Confirm both in App Store Connect.
6. **Widgets:** build them in 2.0 with Codex testing on a Mac, or move them
   to 2.1 so they can't hold up 2.0? Recommended 2.1.
7. **Terms of Use URL** (or Apple's standard EULA) and the **Privacy Policy
   URL** for the paywall.

## 7. Milestones

M1-M9 as in the handoff, in that order, small commits, checks after each:
tsc, Jest (UTC, New York, Tokyo), heat, i18n. StoreKit-session tests and the
paywall UI test run on a Mac through Codex. Rough size: M1-M4 is the core
(about a week of sessions); M6-M7 are the largest.
