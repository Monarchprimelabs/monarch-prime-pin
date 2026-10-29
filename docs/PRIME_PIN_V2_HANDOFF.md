# Monarch Prime Pin 2.0: Premium, Founders and Retention (Claude Code handoff)

Save this file in the repo as `docs/PRIME_PIN_V2_HANDOFF.md`. It is self-contained: everything you need to build the 2.0 update is below. Prepared Oct 24, 2026. App Store id 6770808426, published under Revival Fitness Athletics LLC.

---

## 1. Instructions for Claude Code

**Do these first, in order:**

1. Make sure the working tree is clean (`git status`). If it isn't, stop and ask.
2. Create and switch to the feature branch:
   ```bash
   git checkout -b feature/premium-v2
   ```
   This branch name replaces the "premium-v2" name used inside the prompt in section 2. For Option B (no worksheet), branch from it later with `git checkout -b feature/no-worksheet feature/premium-v2`. Do not merge Option B.
3. **Read the codebase before changing anything.** Map the app structure, the persistence layer (SwiftData or Core Data), the current paywall and 5-free-log logic, the existing lifetime in-app purchase code, the UserDefaults keys 1.x writes, the localization setup (en + es), HealthKit usage, and the concentration worksheet. Then reply with a short plan listing the files you will add or touch, and wait for approval before large changes.
4. Work in **small, reviewable commits** with clear messages (one concern per commit). Follow the milestone order in section 4.
5. **Never push to `main`** and never force-push. Push only `feature/premium-v2` (`git push -u origin feature/premium-v2`).
6. When the milestones are done and tests pass, **open a pull request** from `feature/premium-v2` into `main` (for example with `gh pr create`). Include a summary, the acceptance checklist from section 4, and anything left for the owner to do in App Store Connect.

**Things you must confirm, not guess:**

- **Product IDs.** The IDs below (`com.monarchprime.pin.premium.monthly`, `.annual`, `.lifetime`) are proposals. Confirm them against App Store Connect with the owner before shipping. Match the app's real bundle ID prefix if it differs.
- **The existing $9.99 lifetime product ID.** Find it in the current code (search for `Product.products(for:`, product ID string constants, or the `.storekit` file) and confirm it with the owner against App Store Connect. Put it in `LEGACY_LIFETIME_ID`. Getting this wrong would lock out paying customers.
- **FOUNDER_CUTOFF** (the 2.0 release date) and **FOUNDER_CODE** (the custom offer code) are set by the owner. Leave clearly named constants with TODO comments.
- **StoreKit API names** for win-back offers and SKTestSession can differ by SDK version. Use the names in the installed Xcode and say which ones you used.
- **Terms of Use and Privacy Policy URLs**: ask the owner; use constants.

**Do not:** add third-party SDKs, analytics, remote config or new networking; build CloudKit sync (Phase 6 is plan-only); add any dosing advice, presets or recommended amounts; paywall the concentration worksheet; use `AppTransaction.originalAppVersion`.

---

## 2. Implementation prompt (verbatim from the plan)

Follow this exactly. Where it says "premium-v2", use `feature/premium-v2`.

```text
ROLE
You are working in my existing SwiftUI iOS app "Monarch Prime Pin" (App Store id 6770808426, Health & Fitness). I am a solo developer. Build version 2.0: a Premium subscription tier, a more generous free tier, a lab-results module, expanded read-only Apple Health data, on-device descriptive insights, and a compliance pass on the concentration worksheet. Work in small, reviewable commits on a branch named premium-v2. Before writing code, read the project and give me a short plan listing the files you will touch. Follow the existing persistence layer (SwiftData or Core Data, whichever the app already uses) and existing architecture. Do not add third-party SDKs, analytics, remote config, or networking beyond StoreKit and (only if I approve Phase 6) CloudKit.

HARD RULES (App Review)
1. No hidden, dormant, or remotely toggled features (Guideline 2.5.19). No remote config, no server flags, no date-based unlocks (the one exception is the founder check on originalPurchaseDate, which only identifies existing users and never switches a feature on later), no obfuscation. Every feature in the binary must be visible and documented. Compile-time flags are allowed only to build a different binary.
2. No dosage advice anywhere (Guidelines 1.4.1 / 1.4.2). The app never recommends, suggests, presets, or adjusts an amount for any compound. No compound-specific dose presets, no "typical dose", no protocol libraries with amounts.
3. Never put the concentration worksheet behind the paywall. It stays free for everyone.
4. Users who bought the existing lifetime unlock keep everything they paid for, forever, plus Premium (Guideline 3.1.2: do not take away functionality existing users already paid for).
4b. Every user who had the app before 2.0 is a Founder. Existing free users keep everything the 1.x free tier let them do, with no new limits, ever (see FOUNDERS).
5. Do not store any HealthKit-sourced values in iCloud/CloudKit or any file that syncs off-device (Guideline 5.1.3(ii)). Read them live from HealthKit on each device.
6. Logging is never blocked by a paywall. Remove the current 5-free-logs limit.
7. Every new user-facing string must be localized in English and Spanish (es). Use the existing localization approach (String Catalog if present).

PRODUCTS (App Store Connect + local StoreKit configuration)
- Subscription group: "Monarch Prime Pin Premium" (one group, one level of service for monthly and annual so users cannot hold both).
- com.monarchprime.pin.premium.monthly: auto-renewable, 1 month, USD 4.99.
- com.monarchprime.pin.premium.annual: auto-renewable, 1 year, USD 39.99, introductory offer = free trial, 1 week, new subscribers only.
- com.monarchprime.pin.premium.lifetime: non-consumable, USD 79.99 (new Lifetime Premium).
- LEGACY_LIFETIME_ID = "<CONFIRM_IN_APP_STORE_CONNECT>" : the existing USD 9.99 Lifetime Pro non-consumable. Put it in one constant in StoreConstants.swift. I will remove it from sale in App Store Connect after 2.0 ships; entitlement checks must still honor it.
- Create Products.storekit (StoreKit Configuration File) containing all four products with those prices and the 1-week free trial on annual, and set it in the Run scheme for local testing. Also sync it with App Store Connect if Xcode offers it, but keep the file in the repo.

ENTITLEMENTS (StoreKit 2)
Create EntitlementManager.swift:
- @MainActor @Observable final class EntitlementManager.
- enum PremiumSource { case none, legacyLifetime, lifetimePremium, subscription(expires: Date?) }.
- var source: PremiumSource; computed var isPremium: Bool; var isLegacyFounder: Bool (true when legacyLifetime).
- var products: [Product] loaded via Product.products(for:) with all four IDs; expose monthly, annual, lifetime as optionals.
- func refresh() async: iterate Transaction.currentEntitlements; for each .verified(transaction) where transaction.revocationDate == nil: if productID == LEGACY_LIFETIME_ID -> legacyLifetime; if lifetime ID -> lifetimePremium; if productType == .autoRenewable and the subscription is active -> subscription. Ignore .unverified results (log them in DEBUG only). Priority: legacyLifetime, then lifetimePremium, then subscription.
- For subscription state, also read Product.SubscriptionInfo.status for the group: treat .subscribed and .inGracePeriod as premium; .inBillingRetryPeriod, .expired, .revoked as not premium.
- Start a long-lived Task at app launch (in the App struct, held by the manager) that listens to Transaction.updates, verifies, calls transaction.finish(), then refresh(). Also call refresh() on launch and when scenePhase becomes .active.
- func purchase(_ product: Product) async throws -> Bool handling .success(.verified) (finish + refresh), .success(.unverified), .pending, .userCancelled.
- func restore() async: try await AppStore.sync(), then refresh(). Surface errors in UI.
- func isEligibleForTrial() async -> Bool using await annualProduct.subscription?.isEligibleForIntroOffer (fallback: Product.SubscriptionInfo.isEligibleForIntroOffer(for: groupID)). Paywall copy must change when not eligible (no trial wording).
- DO NOT use AppTransaction.originalAppVersion for anything. Reason: the app was always free, so it does not tell us who paid; on iOS it is the build number (CFBundleVersion), it returns "1.0" in sandbox, and it has been reported to return "1.0" in the App Review environment, which can wrongly unlock or lock. Paid founders are identified only by the legacy non-consumable transaction.
- Inject the manager via .environment at the root.

FOUNDERS (everyone who had the app before 2.0)
Create FounderManager.swift (@MainActor @Observable):
- enum FounderStatus: String, Codable { case none, freeFounder, paidFounder }.
- paidFounder: the user has a verified, unrevoked LEGACY_LIFETIME_ID transaction. They get Premium for life (EntitlementManager legacyLifetime) plus the badge.
- freeFounder: decide ONCE on the first launch of 2.0, then persist the result in the Keychain (service "com.monarchprime.pin.founder") and mirror it to UserDefaults. A user is a freeFounder if ANY of these is true:
  (a) Pre-existing 1.x data. Before changing anything, read the 1.x code and list every UserDefaults key and persistent-store entity that 1.x writes (for example an onboarding-complete flag, the free-log counter used by the old 5-log limit, theme choice, any saved log, plan or vial). If any of them exists at first 2.0 launch, the user is a founder. Run this check BEFORE any 2.0 migration code writes new keys.
  (b) AppTransaction date. let result = try await AppTransaction.shared; if case .verified(let appTx) = result, and appTx.environment == .production, and appTx.originalPurchaseDate < FOUNDER_CUTOFF (a Date constant in StoreConstants.swift that I will set to the 2.0 release date), the user is a founder. This catches people who deleted and reinstalled with the same Apple Account. Wrap in do/catch; if it fails (offline), retry on later launches until one check succeeds.
  Never use originalAppVersion. In sandbox, TestFlight and App Review, (b) must be false (environment check) so testers and reviewers see the normal new-user experience. Add simulation of each status only inside a #if DEBUG settings section.
- What freeFounders get, forever:
  1. Everything the 1.x free tier allowed stays allowed. Read the 1.x gating code, list each feature a free 1.x user could use (within the old 5-log limit) in FOUNDER_FREE_FEATURES, and make FeatureGate return true for those Feature cases when status == freeFounder. No new limits for them, ever.
  2. Unlimited logging (same as everyone).
  3. A "Founding Member" badge in the Settings header and Premium screen, plus an optional small mark on exported stats cards.
  4. A founder price on Premium: the paywall shows a "Founder price" card explaining the offer, shows FOUNDER_CODE (a constant; I will create a custom subscription offer code in App Store Connect on the annual product) with a copy button, and opens the system redemption sheet via .offerCodeRedemption(isPresented:). Do not apply discounts any other way.
- paidFounders also get the badge. Their paywall shows the Founder state ("You own Premium forever. Thank you.") with no purchase buttons.

FEATURE GATING
Create FeatureGate.swift with a single enum and one check function so gating lives in one place:
enum Feature: CaseIterable { case unlimitedActivePlans, fullHistoryHeatmap, heatmapReplay90Day, perCompoundCharts, advancedAnalytics, progressPhotoCompare, monthlyPDF, labResults, insights, expandedHealth, labReminders, fullWeeklySummary, extraThemes, statsCardNoWatermark, cloudSync }
func allows(_ f: Feature) -> Bool: premium (any source, including legacyLifetime) -> true; freeFounder -> true if f is in FOUNDER_FREE_FEATURES, else false; free -> false.
FREE (no gate, list them in a comment): unlimited logging, Log This Again, body map heatmap for the last 30 days, calendar and history, this-week analytics, up to 2 active plans with reminders and Today view, vial inventory with running-low alerts and restock reminders, concentration worksheet, unit conversions, templates, progress photo capture and check-in reminders, symptom tags, streaks, widgets, Face ID/passcode lock, CSV export, backup/restore, stats card export (with a small "Made with Monarch Prime Pin" footer), basic weekly summary, 1 theme, Spanish.
Add a view modifier .premiumGated(_ feature: Feature) that shows a lock badge and presents the paywall on tap instead of the feature. Gated features must still be visible (with a lock), never hidden, so reviewers can see them.
Remove the old 5-log paywall logic and any code paths that block saving a log.

PAYWALL (PaywallView.swift)
- Native SwiftUI. Options: Annual (preselected, badge "Best value"), Monthly, Lifetime Premium.
- Show for annual: "USD 39.99/year" from product.displayPrice and the per-month equivalent computed from product.price / 12 formatted with product.priceFormatStyle, labeled as "equivalent to X/month". Never hardcode prices in strings; always use StoreKit displayPrice.
- If trial eligible: primary button "Start 1-week free trial", and directly under it: "Free for 1 week, then 39.99/year. Renews automatically unless canceled at least 24 hours before the end of the current period. Cancel anytime in Settings > Apple ID > Subscriptions." (use real localized prices). If not eligible: "Subscribe for 39.99/year" with the same renewal text minus the trial part.
- Monthly: "4.99/month, renews monthly until canceled." Lifetime: "One-time purchase. Not a subscription."
- Clear list of exactly what Premium includes (match FeatureGate cases in plain language). Required by 3.1.2(c).
- Buttons/links: Restore Purchases (calls restore), Redeem Code (.offerCodeRedemption(isPresented:)), Terms of Use (Apple standard EULA URL or my terms URL constant), Privacy Policy (constant URL), Manage Subscription (.manageSubscriptionsSheet) when subscribed.
- Close button always visible. No countdowns, no fake discounts, no dark patterns.
- Trial timeline (only when trial eligible): "Today: full Premium access. Day 5: we remind you (if you allow notifications). Day 7: annual starts at PRICE unless you cancel."
- When source == .legacyLifetime show the Founder state instead of offers: "You are a Founder. You own Premium forever. Thank you." with no purchase buttons. When status == freeFounder show the Founder price card above the plans.
- PaywallView takes a placement: enum PaywallPlacement { onboardingEnd, lockedFeature(Feature), monthlyRecap, heatmapBeyond30Days, thirdPlan, labsTab, settings, lapsed }. Auto-presented placements (onboardingEnd, monthlyRecap, heatmapBeyond30Days, lapsed) show at most once per 7 days, never during log entry, never in the same session as a failed purchase. User-initiated placements always work.
- Win-back: if the user has no active entitlement but has an expired subscription transaction, and StoreKit reports an eligible win-back offer (iOS 18+: the renewal info's eligible win-back offer IDs and product.subscription?.winBackOffers; confirm exact API names in the installed SDK), show "Welcome back" with that offer and purchase with the .winBackOffer(offer) purchase option. Otherwise show the normal plans.

STOREKIT MESSAGES
- At launch, listen to StoreKit Message.messages. Let the system display win-back, billing-issue and price-increase messages (don't suppress them). If the user is mid-entry on the log form, defer and display right after the save.

FOUNDER MIGRATION SHEETS
- On first launch of 2.0, show exactly one sheet: paidFounder -> PaidFounderSheet; freeFounder -> FreeFounderSheet; none -> nothing. Copy keys founder.paid.title/body/cta and founder.free.title/body/cta (I will paste the copy). Remember that it was shown. If the user taps "Love it", call requestReview from the SwiftUI environment (no custom rating prompt).

RETENTION: LOCAL NOTIFICATIONS (no server, no third-party SDK)
Create NotificationScheduler.swift using UNUserNotificationCenter local notifications only.
- Ask permission when the user creates their first plan reminder, never at first launch.
- Settings > Notifications lists every type with its own toggle, quiet hours (default 22:00-08:00) and a cap of 2 non-plan notifications per day. Everything is visible there (2.5.19).
- Types:
  1. Plan reminders (free): at the times the user set. Category with actions "Log it" (runs LogAgainIntent in the background without opening the app) and "Snooze 1 h".
  2. Plan follow-up (free, default on): if a planned entry for today is not logged by 20:00 local, one gentle note. No guilt or streak-loss threats.
  3. Vial running low (free): when remaining entries at the user's recorded amounts <= threshold (default 2, editable), once per container. Text: "Vial X: about 2 entries left at your recorded amounts." No links, no store or vendor names.
  4. Restock reminder (free): a user-chosen date per vial. Neutral text only.
  5. Weekly summary (Sunday 18:00): free gets entry count and sites used; Premium (fullWeeklySummary) opens full weekly insights.
  6. Monthly report ready (Premium): 1st of the month 09:00, opens the PDF. Free users get a short in-app monthly recap and at most once a month the monthlyRecap paywall with a blurred PDF preview.
  7. Progress photo check-in (free; compare is Premium): off / weekly / every 2 weeks / monthly, user-chosen.
  8. Lab reminder (Premium, labReminders): user enters the next lab date; reminders 3 days before and on the day; afterwards "Add your results".
  9. Trial ending (opt-in toggle on the paywall): 2 days before the trial ends: "Your free trial ends on DATE. You won't be charged if you cancel before then."
- No promotional notifications unless the user turns on a separate "News and offers" toggle (off by default; Guideline 4.5.4).
- All copy in en + es. No amounts, no dosing language.

RETENTION: WIDGETS (free, they drive daily opens)
- Add a WidgetKit extension and an App Group. After each change the app writes a small read-only snapshot to the shared container for the widget.
- Small: next scheduled entry plus an interactive "Log it" button (App Intent LogAgainIntent, iOS 17+). Medium: 30-day mini heatmap. Lock screen accessory: current streak.
- Live Activities and Apple Watch: do not build now. Write docs/later-phases.md with a short plan.

LAPSED PREMIUM
- When Premium ends, never delete or hide data. Lab results and photos stay viewable and exportable; charts, insights, PDF and expanded Health lock again with the lock badge. Show one "Premium ended, your data is safe" sheet with Resubscribe (and a win-back offer if eligible).
- Settings > Premium for subscribers: plan, renewal or expiry date from the transaction, "Switch to annual" (buy the annual product in the same group; the App Store handles the change), and Manage Subscription (.manageSubscriptionsSheet). Cancellation happens only in Apple's UI; do not build a fake cancel flow.

ON-DEVICE METRICS (privacy-safe)
- LocalMetrics.swift: on-device counters only (days opened, entries logged, notification actions by type, paywall shown or purchased by placement). Stored in the app container, never transmitted, no identifiers. Use them only for frequency caps and a user-visible "Your activity" card. Developer-only views stay inside #if DEBUG so Release builds have no hidden screens (2.5.19). The App Privacy label stays "Data Not Collected". I get aggregate retention from App Store Connect, not from code.

REVIEW PROMPTS
Use the SwiftUI requestReview environment action only at positive moments: after a 7-day logging streak, after a successful PDF/stats export, after the 10th log. At most once per 60 days by my own counter (the system also limits frequency). Never in the paywall or right after a purchase failure.

LAB RESULTS MODULE (Premium)
- Model LabResult: id, date, panelName (user text), markerName (user text with autocomplete from a plain list of common marker NAMES only, no values), value (Double), unit (user text), refLow (Double?), refHigh (Double?) both user-entered from their own lab report, notes, createdAt.
- Views: list by date, add/edit form, per-marker Swift Charts line chart with the user-entered reference band shaded, optional overlay of the user's own log dates as vertical rule marks (descriptive only).
- Allowed copy: "Outside the reference range you entered". Not allowed: any interpretation, diagnosis, modeling, predicted levels, or suggestion to change anything. No hormone modeling.
- Include in CSV export and backup/restore.
- Footer disclaimer on every lab screen: "For personal record-keeping only. Not medical advice. Discuss lab results with a licensed clinician."

EXPANDED APPLE HEALTH (Premium, read-only)
- Keep existing free reads (body mass, body fat percentage, step count).
- Premium adds read-only: heartRateVariabilitySDNN, restingHeartRate, sleepAnalysis, bloodGlucose, leanBodyMass, waistCircumference.
- Request authorization only when the user opens the expanded Health screen. Update NSHealthShareUsageDescription in English and Spanish to name these types and the purpose (showing the user their own trends next to their logs).
- Never write to HealthKit. Never persist HealthKit samples in CloudKit or exported backups unless the user explicitly exports a CSV.
- UI: small trend cards and a 30/90-day chart. Descriptive only.

INSIGHTS (Premium, on-device, deterministic)
- Implement InsightEngine as pure Swift functions over the user's own data. No LLM in this version, no network.
- Allowed insight types: counts and frequencies ("14 entries across 3 compounds in October"), site rotation facts ("Left abdomen used 5 times in 14 days; right thigh not used in 21 days"), adherence vs the user's own plan ("12 of 14 planned entries logged"), inventory facts ("Vial A: 2 logged entries remaining at your recorded amounts"), and descriptive Health comparisons ("Average logged sleep: 7.1 h on days with entries vs 7.0 h without").
- Forbidden: any recommendation about amounts, timing changes, stacking, or health outcomes. Add a unit test that runs every insight template with fixture data and fails if output matches (case-insensitive) any of: "should", "recommend", "increase", "decrease", "optimal", "safe dose", "take more", "take less", "try ", "deberías", "recomend", "aumenta", "disminuye".
- Each insight card has a footer: "Summary of your own entries. Not medical advice."

CONCENTRATION WORKSHEET (keep free; Option A in this branch)
- Keep it as user-entered reference math only. Inputs: amount in container (mg or mcg), diluent volume (mL), the amount the user enters, syringe type (U-30/50/100). Output: volume in mL and syringe unit markings for the amount the user entered.
- Remove any compound-specific presets, default amounts, suggested amounts, or "common dose" text. Remove the word "dose" from the screen title and labels; use "Worksheet: concentration and unit conversion" and "amount". Fields start empty.
- Show the formula used ("concentration = amount in container / volume; volume needed = entered amount / concentration; units = volume x 100") with a "Show math" disclosure.
- Persistent banner at top (not dismissible): "Math helper for numbers you enter. It does not recommend amounts for any substance. Confirm all measurements with a licensed pharmacist or clinician." Same in Spanish.
- Not gated, not mentioned on the paywall, not shown in App Store screenshots.
- Do not add any runtime toggle for it.

OPTION B (prepare, do not merge)
- Create branch no-worksheet from premium-v2. Wrap the worksheet entry point and files in #if !REMOVE_WORKSHEET using a Swift Active Compilation Condition REMOVE_WORKSHEET set only in a separate build configuration/scheme "Release-NoWorksheet". In that build the worksheet code is excluded from the binary entirely and the Tools list does not reference it. Keep unit conversions (mg to mcg, mL) available. Write a short WHATS_NEW_NOWORKSHEET.md explaining the change for release notes.

CLOUD SYNC (Phase 6, DO NOT IMPLEMENT until I reply "approve Phase 6")
- Plan only: CloudKit private database, user's own iCloud account, no app account. Sync only user-entered records (logs, plans, inventory, symptoms, lab results, photo files optional). Exclude all HealthKit-derived data. Local-first; conflict policy last-writer-wins per record with modifiedAt; full local backup before first sync. Write the plan to docs/cloudsync-plan.md with risks (Guideline 4.10 on monetizing iCloud, 5.1.3(ii) on personal health information in iCloud).

TESTS
- StoreKitTests target using SKTestSession(configurationFileNamed: "Products"): resetToDefaultState, clearTransactions, disableDialogs = true. Use the current SKTestSession API names in the installed Xcode.
- Cases: (1) fresh user is free and can save unlimited logs; (2) buying annual sets subscription and isPremium; (3) trial eligibility true for new user, false after a prior subscription; (4) expiring the subscription returns to free; (5) refund/revocation removes premium; (6) legacy lifetime purchase sets legacyLifetime and isPremium and shows Founder state; (7) new lifetime purchase sets lifetimePremium; (8) restore works; (9) every Feature returns false for free and true for premium; (10) worksheet reachable while free; (11) insight forbidden-words test; (12) Spanish strings exist for all new keys; (13) founder detection: 1.x keys or data present -> freeFounder, nothing present -> none, legacy lifetime -> paidFounder, a non-production AppTransaction never sets founder, result persists across launches; (14) freeFounder keeps every FOUNDER_FREE_FEATURES case; (15) notification scheduler respects quiet hours and the daily cap and never requests permission before the first reminder; (16) win-back path appears only after an expired subscription with an eligible offer; (17) lapsed Premium keeps lab results and photos visible and exportable; (18) auto-presented paywall frequency cap.
- UI test: paywall shows price, renewal terms, Restore, Terms, Privacy.

DELIVERABLES
- Code + tests passing, Products.storekit, updated Localizable (en, es), Info.plist usage strings, docs/REVIEW_NOTES.md (I will paste the review notes text), docs/CODEX_AUDIT.md (checklist below), and a CHANGELOG entry for 2.0.

CODEX AUDIT CHECKLIST (write to docs/CODEX_AUDIT.md)
1. grep for remote config, feature flags, URLSession calls, date-based unlocks: none except StoreKit/CloudKit.
2. Every Feature case is visible with a lock when free; nothing hidden.
3. No string anywhere recommends an amount; search en and es strings for dose, dosis, recommend, recomend, should, deberías.
4. Worksheet: no presets, empty fields, banner present, not gated, no runtime toggle.
5. Legacy lifetime ID honored; originalAppVersion not used for entitlement.
6. Transaction.updates listener started at launch; every verified transaction finished.
7. Paywall: displayPrice used, renewal terms, trial text only when eligible, Restore, Terms, Privacy, close button.
8. HealthKit data never written to CloudKit, backups, or logs.
9. No crash when products fail to load (offline): paywall shows retry, app fully usable.
10. All new strings localized en + es.
11. No network calls for metrics and no analytics SDKs; App Privacy label still accurate.
12. Promotional notifications only behind the opt-in "News and offers" toggle.
13. Founder status computed once, stored in Keychain, never from originalAppVersion; production-only date check.
14. Notification and widget copy has no dosing language and no vendor names.
15. No hidden debug screens in Release builds.
```

### App Review notes draft

Save as `docs/REVIEW_NOTES.md`. The owner pastes it into App Store Connect > App Review Information > Notes.

```text
App Review notes, Monarch Prime Pin 2.0

What changed
1. New optional Premium subscription (group "Monarch Prime Pin Premium"): monthly 4.99, annual 39.99 with a 1-week free trial for new subscribers, and a one-time Lifetime Premium 79.99. Premium adds: lab results log with charts, on-device summaries of the user's own entries, expanded read-only Apple Health trends (HRV, resting heart rate, sleep, blood glucose, lean body mass, waist), full-history site heatmap with 90-day replay, per-compound charts, unlimited active plans, monthly PDF reports, extra themes.
2. Free tier is now more generous: logging is unlimited for everyone (the previous 5-entry limit is removed).
3. Existing customers who bought the earlier one-time Lifetime Pro unlock keep everything they paid for and automatically receive Premium at no cost, identified by their existing non-consumable purchase via StoreKit 2 Transaction.currentEntitlements.
4. Existing free users ("Founding Members") keep every feature they had in 1.x with no new limits, get a badge, and see a founder offer code for the annual plan. They are identified on device by existing 1.x app data or AppTransaction.originalPurchaseDate before the 2.0 release date (production only). A fresh install in the review environment shows the standard new-user experience and paywall.
5. Optional local notifications (reminders the user schedules, weekly summary, low-vial alerts) and home-screen widgets. All are controlled in Settings > Notifications; promotional notifications are off unless the user opts in.

How to review
- No account or login. All data is stored on device.
- Paywall: Tools > any item with a lock icon, or Settings > Premium. Restore Purchases, Redeem Code, Terms of Use and Privacy Policy are on the paywall.
- Lab results: Premium > Labs. Users enter their own values and the reference range printed on their own lab report. The app shows charts only and does not interpret results.
- Insights are deterministic summaries of the user's own entries (counts, site usage, plan adherence). They contain no recommendations.

Concentration worksheet (Guideline 1.4.2)
- The Tools > Worksheet screen is a unit-conversion helper for numbers the user types in (amount in container, volume, amount entered, syringe scale). It does not contain or suggest amounts for any substance, has no compound presets, and starts with empty fields. It shows the arithmetic used.
- A permanent banner states it does not recommend amounts and that measurements should be confirmed with a licensed pharmacist or clinician.
- It is free for all users and is not part of Premium or marketing materials.
- If App Review determines this feature still falls under 1.4.2, please tell us and we will remove it in an update; we have that build ready.

Health information (Guideline 1.4.1)
- The app does not provide medical advice. Any educational text is cited to named sources on an in-app Sources screen (for example MedlinePlus, a U.S. National Library of Medicine service). The app reminds users to consult a clinician before making medical decisions.

Hidden features (Guideline 2.5.19)
- The app contains no hidden, dormant, or remotely enabled features. There is no remote configuration. All features are visible in the UI.

Contact: <your email> / <your phone>
```

---

## 3. Condensed product spec

### 3.1 Free vs Premium

| Feature | Free | Premium |
|---|---|---|
| Logging, Log This Again, streaks | Unlimited | Unlimited |
| Body map heatmap | Last 30 days | Full history + 90-day replay |
| Plans, reminders, Today view | 2 active plans | Unlimited |
| Calendar and history | Yes | Yes |
| Weekly analytics | This week | All history, per-compound charts |
| Vial inventory, templates, unit conversions | Yes | Yes |
| Concentration worksheet | Yes (never gated) | Yes |
| Progress photos | Capture | Side-by-side compare |
| Symptom tags | Tags + 7-day summary | Full summary history |
| CSV export, backup/restore, Face ID lock | Yes | Yes |
| Stats card export | With small app footer | Footer optional |
| Monthly PDF summary | No | Yes |
| Lab results log + trend charts | No | Yes |
| Insights (on-device, descriptive) | No | Yes |
| Apple Health | Weight, body fat, steps | + HRV, resting HR, sleep, glucose, lean mass, waist |
| Themes | 1 | All 3+ |
| iCloud sync (phase 2, see risk) | No | Decide later |
| Reminders, low-vial and restock alerts, photo check-ins | Yes | Yes |
| Weekly summary | Basic counts | Full weekly insights |
| Lab reminders | No | Yes |
| Widgets (next entry, 30-day map, streak) | Yes | Yes |
| Live Activities, Watch app | Later phase | Later phase |
| Founding Members (pre-2.0 users) | Everything 1.x gave them, forever + badge + founder price | Paid founders: Premium for life |

Keep data-safety features (CSV export, backup/restore, app lock) free: they protect trust and the no-account promise. The free stats card carries a small "Made with Monarch Prime Pin" footer, which turns every share into a free ad.

### 3.2 Pricing

| Product | Price | Net at 15% | Notes |
|---|---|---|---|
| Premium Monthly | $4.99/mo | $4.24/mo | Entry price, no trial |
| Premium Annual (default) | $39.99/yr | $33.99/yr ($2.83/mo) | 1-week free trial via introductory offer, new subscribers only |
| Lifetime Premium | $79.99 once | $67.99 | Anchor; makes annual look cheap. $99.99 is the alternative test |
| Legacy Lifetime Pro | $9.99 (remove from sale) | n/a | Entitlement honored forever + Premium free |

Net figures assume the App Store Small Business Program 15% rate and ignore taxes, which vary by storefront.

Subscription group: "Monarch Prime Pin Premium" (monthly and annual at the same level of service). Annual is preselected on the paywall. 7-day free trial on annual only, as an introductory offer for new subscribers.

### 3.3 Retention loops

| Loop | Brings them back | Tier |
|---|---|---|
| Today view + plan reminders | Daily; "Log it" right from the notification or widget | Free |
| Rotation heatmap | Every entry changes the map; least recently used zone shown as a fact, not advice | Free 30 days; Premium full + replay |
| Streaks | Daily; Lock Screen streak widget; no guilt copy | Free |
| Vial running low + restock reminder | When a container is nearly used up, and on a restock date the user sets | Free |
| Weekly summary notification | Sunday evening | Free basic; Premium full insights |
| Monthly PDF report | 1st of each month | Premium |
| Progress photo check-ins | On a schedule the user picks | Capture free; compare Premium |
| Lab reminders | Before and after each lab date the user enters | Premium |
| Widgets | Next entry, 30-day mini map, streak | Free in 2.0 |
| Live Activities, Apple Watch | Later phase | Decide later |

Keep the habit tools free (reminders, widgets, streaks, low-vial alerts). They drive daily opens, and daily users are the ones who convert and renew. No vendor names or links in any alert.

**What makes Premium worth paying for every month (3.1.2(a) "ongoing value"):** a new monthly PDF report and a fresh set of insights; history views (full heatmap, per-compound charts, lab trends) that get more useful over time; lab reminders and full weekly summaries; one visible Premium improvement per month named in What's New. Themes and badges are extras, never the reason to subscribe.

**Paywall placements** (automatic ones at most once every 7 days):

| Moment | What they see | Cap |
|---|---|---|
| End of onboarding | Soft paywall with trial timeline | Once |
| Tap on a locked feature | Paywall focused on that feature | Always (user-initiated) |
| 1st of the month | Free recap + blurred PDF preview | Once a month |
| Heatmap reaches 30 days | See beyond 30 days + replay | Once |
| Adding a 3rd plan | Unlimited plans | When it happens |
| Labs tab | Labs explainer + trial | Always (user-initiated) |
| Never | During logging, after a failed purchase, in the first minute | n/a |

**Cancellation and win-back:** cancellation happens only in Apple's UI (offer Manage Subscription and "Switch to annual" in-app; no fake cancel flow). Treat billing grace period as active. Support StoreKit win-back offers (iOS 18+) via the StoreKit message and the paywall's "Welcome back" state. When Premium lapses, data stays visible and exportable.

### 3.4 Founder rules

Everyone who had the app before 2.0 is a Founding Member.

| Group | What they get | How the app knows |
|---|---|---|
| Paid founders (~10, $9.99 Lifetime Pro) | Everything they bought + Premium free for life + badge | Legacy non-consumable in `Transaction.currentEntitlements` (works on restore and new devices) |
| Free founders (everyone else on 1.x) | Everything 1.x gave them, no new limits ever; unlimited logging; badge; founder price on Premium | Existing 1.x data on first 2.0 launch, or `AppTransaction.originalPurchaseDate` before the 2.0 release date (production only) |
| New users after 2.0 | Standard free tier + Premium with trial | Neither signal present |

**Identifying free founders**

1. Existing local data (most reliable). On the first 2.0 launch, before any migration runs, check for anything 1.x wrote: the onboarding flag, the old free-log counter, settings, or any saved log, plan or vial. This covers everyone who still has the app installed.
2. `AppTransaction.originalPurchaseDate` before a cutoff set to the 2.0 release date. This covers people who deleted the app and reinstalled with the same Apple Account. Only trust it when the AppTransaction environment is production; its sandbox, TestFlight and App Review behavior isn't verified, so test before relying on it.
3. Optional extra step: ship a small 1.x update now that writes a founder flag to the Keychain. It only helps people who install that update before 2.0, and iOS doesn't guarantee Keychain items survive an app deletion, so treat it as a backup signal.
4. Save the result once (Keychain + UserDefaults) so it never flips later.
5. Don't use `originalAppVersion`. It returns the build number, it's "1.0" in sandbox, and developers report "1.0" during App Review too, which has caused 2.1 rejections.

If a reviewer is misread as a founder, they only see 1.x free features and a badge, not paid Premium, so the risk is low.

**Founder price: how to deliver it**

- Recommended: a custom subscription offer code (for example FOUNDER) on the annual plan, such as the first year at a reduced price paid up front. The price is the owner's call. The founder sheet and paywall show the code and open Apple's redemption sheet. No server needed.
- Codes can be shared beyond founders. Set a redemption limit and an expiry (for example 60 days) and accept a little leakage.
- Promotional offers could target founders automatically, but Apple requires a server-signed signature (JWS) for them. Skip them unless a small signing endpoint is added later.
- 3.1.2: nothing an existing user had can move behind the subscription for them. Founder rules in FeatureGate guarantee that.
- Remove the $9.99 product from sale after 2.0 is approved. Removed products still restore.

### 3.5 Migration copy

Put these in Localizable (en + es) under the keys named in the prompt. Bracketed values are placeholders the owner fills in.

**Paid founders (legacy lifetime):**

```text
Title: You're a Founder, for life

Body:
You bought Monarch Prime Pin before Premium existed. You backed this app first, so you keep everything you paid for, forever, and you now get every Premium feature free for life: lab results, insights, full heatmap history, monthly PDF reports and everything I add next.

No subscription. Nothing to do. Look for the Founding Member badge in Settings.

Thank you for betting on a solo dev from day one. If Prime Pin has been useful, a short App Store review helps more than anything.

Buttons: [Love it]  [Maybe later]
```

**Free founders (all other existing users):**

```text
Title: You're a Founding Member

Body:
You downloaded Prime Pin before Premium existed. You were one of the first people to give it a shot, and that counts.

What it means for you:
- Everything you could do before stays yours. No new limits, ever.
- Logging is now unlimited.
- A Founding Member badge in Settings and on your stats cards.
- Founder price on Premium: code [FOUNDER CODE] gets your first year of annual for [founder price]. Redeem in Settings > Premium. Offer ends [date].

Premium adds lab results, insights from your own entries, full heatmap history and monthly PDF reports. Totally optional.

Thank you for being here first.

Buttons: [Love it]  [See Premium]
```

**App Store "What's New" for 2.0** (for the owner to paste in App Store Connect; also add to CHANGELOG):

```text
Version 2.0
- Founding Members: everyone who downloaded before this update keeps everything they had, with no new limits, plus a Founding Member badge and a founder price on Premium.
- Bought Lifetime Pro? You keep everything and get Premium free for life.
- Logging is now unlimited for everyone, free.
- New reminders that work for you: one-tap "Log it" from notifications, low-vial alerts, restock reminders, photo check-ins and a Sunday summary. All optional, all in Settings.
- New home-screen and Lock Screen widgets: next entry, 30-day site map, streak.
- New Premium (optional): lab results log with charts and lab reminders, summaries of your own entries, expanded Apple Health trends (HRV, resting heart rate, sleep, glucose), full heatmap history with 90-day replay, per-compound charts, monthly PDF reports.
- The annual plan includes a 1-week free trial for new subscribers. Monthly and one-time Lifetime options are also available.
- Worksheet clarified: a math helper for numbers you enter. It does not recommend amounts.
- Full Spanish support for all new screens.
```

---

## 4. Build order (milestones) and acceptance criteria

Each milestone is one or more small commits. Build and run the tests at the end of each one.

**M0. Recon and plan (no code changes)**
- Accept: written plan listing files to touch; list of 1.x UserDefaults keys and stored entities; the existing lifetime product ID found in code; list of features 1.x free users could use (FOUNDER_FREE_FEATURES draft). Owner approves before M1.

**M1. StoreKit foundation**
- `StoreConstants.swift` (product IDs, `LEGACY_LIFETIME_ID`, `FOUNDER_CUTOFF`, `FOUNDER_CODE`, URLs), `Products.storekit` with all four products and the 1-week annual trial, wired into the Run scheme; `EntitlementManager` with `Transaction.updates` listener, `currentEntitlements`, subscription status, purchase, restore, trial eligibility.
- Accept: StoreKit tests 2-8 pass; no use of `originalAppVersion`; every verified transaction is finished.

**M2. Founders**
- `FounderManager`: 1.x-data check runs before any 2.0 migration, production-only `originalPurchaseDate` check, Keychain + UserDefaults persistence, DEBUG-only simulation.
- Accept: tests 13-14 pass; paid founder = Premium for life; free founder keeps every FOUNDER_FREE_FEATURES case; status never flips after it's set.

**M3. Feature gating + remove the 5-log limit**
- `FeatureGate` (single enum + `allows`), `.premiumGated` modifier with visible lock badges; delete old 5-log paywall logic.
- Accept: tests 1, 9 and 10 pass; saving a log never hits a paywall; every gated feature is visible with a lock when free; worksheet reachable while free.

**M4. Paywall, migration sheets, review prompts**
- `PaywallView` with placements, annual preselected, per-month equivalent, trial timeline, all 3.1.2 disclosures, Restore, Redeem Code, Terms, Privacy, Manage Subscription, Founder state and founder price card, win-back "Welcome back" state; StoreKit `Message.messages` handling; founder sheets; requestReview at positive moments.
- Accept: UI test passes; tests 16 and 18 pass; no hardcoded prices; close button always visible; exactly one founder sheet shown once.

**M5. Worksheet Option A**
- Remove presets and "dose" wording, empty fields, "Show math", permanent banner (en + es), no runtime toggle, not gated.
- Accept: audit items 3-4 pass; worksheet not referenced on the paywall.

**M6. Premium modules**
- Lab results (model, list, form, Swift Charts with user-entered reference band, CSV/backup support, disclaimers); expanded read-only HealthKit types with updated usage strings; deterministic `InsightEngine` with the forbidden-words test; full history heatmap/replay, per-compound charts, monthly PDF and extra themes gated.
- Accept: test 11 passes; HealthKit data never written to CloudKit or backups; disclaimers on every lab and insight screen.

**M7. Retention: notifications, widgets, lapsed state, local metrics**
- `NotificationScheduler` with all 9 types, per-type toggles, quiet hours, a daily cap, actionable "Log it" via `LogAgainIntent`, opt-in "News and offers"; WidgetKit extension + App Group (small with interactive Log button, medium 30-day map, lock screen streak); lapsed-Premium experience and Settings > Premium; `LocalMetrics` on-device only.
- Accept: tests 15 and 17 pass; permission is requested only at the first reminder; no network calls; App Privacy label still "Data Not Collected".

**M8. Localization, docs, audit, PR**
- All new strings in en + es (test 12); `docs/REVIEW_NOTES.md`, `docs/CODEX_AUDIT.md`, `docs/later-phases.md`, `docs/cloudsync-plan.md` (plan only), CHANGELOG 2.0 entry; run the 15-item Codex audit checklist and fix findings.
- Accept: all tests pass; audit checklist all green; PR opened from `feature/premium-v2`.

**M9. Option B branch (prepare, don't merge)**
- `feature/no-worksheet` from `feature/premium-v2`: `REMOVE_WORKSHEET` Active Compilation Condition in a separate `Release-NoWorksheet` configuration/scheme; worksheet code excluded at compile time; unit conversions kept; `WHATS_NEW_NOWORKSHEET.md`.
- Accept: the Release-NoWorksheet build contains no worksheet code or entry point; the default build is unchanged. Push the branch; no PR unless the owner asks.

**Owner-side tasks to list in the PR:** confirm product IDs and the legacy ID; create the subscription group and products and the 1-week intro offer; create the FOUNDER custom offer code with a limit and expiry; set FOUNDER_CUTOFF; enable Billing Grace Period; after approval, create win-back offers and remove the $9.99 product from sale; paste the review notes; update screenshots (no worksheet screenshot).

---

## 5. Compliance guardrails (App Review Guidelines, updated Oct 16, 2026)

| Guideline | What it says (summary) | Guardrail in this app |
|---|---|---|
| 1.4.1 | Medical apps get extra scrutiny; disclose data/methodology; remind users to consult a doctor | No medical advice; cite named sources (e.g. MedlinePlus) for any health text on a Sources screen; lab module shows user-entered values only, no interpretation or hormone modeling |
| 1.4.2 | Drug dosage calculators must come from approved entities (manufacturer, hospital, pharmacy, etc.) or have FDA-equivalent approval | Worksheet is user-entered unit math only: no presets, no suggested amounts, empty fields, permanent banner, never paywalled, not in screenshots. Option B build removes it at compile time |
| 2.5.19 | No hidden, dormant, or undocumented features | No remote config, server flags, or date-based unlocks; gated features visible with a lock; debug UI only inside `#if DEBUG`; Option B is a separate build configuration, never a runtime toggle |
| 3.1.2(a) | Subscriptions must provide ongoing value; don't take away what existing users paid for | Premium built on refreshing value (monthly PDF, insights, labs, history, monthly updates); legacy lifetime buyers get Premium for life; free founders keep all 1.x features |
| 3.1.2(c) | Describe what users get before asking them to subscribe | Paywall lists exact Premium features, price, renewal terms, trial terms, Restore, Terms, Privacy |
| 4.5.4 | No promotional push without explicit opt-in | Promotional notifications only behind an off-by-default "News and offers" toggle |
| 4.10 | Don't monetize built-in capabilities such as iCloud storage | iCloud sync is not a headline paid feature in 2.0; Phase 6 is plan-only |
| 5.1.3(ii) | Don't store personal health information in iCloud | HealthKit data read live, never written to CloudKit, backups, or logs |

Also: logging is never paywalled; every new string in en + es; no vendor names, sourcing links, or medical claims anywhere in the app, notifications or widgets. This is product guidance, not legal advice.
