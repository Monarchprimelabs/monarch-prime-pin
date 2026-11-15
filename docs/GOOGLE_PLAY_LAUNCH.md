# Google Play launch: Monarch Prime Pin for Android

The Play Console account (monarchprimelabs@gmail.com) is an organization
account under the LLC, so the 14-day, 12-tester closed test that new
personal accounts need does not apply. An Android listing was started but
never sent to review, so nobody has bought the Android app and there is no
paid-app grandfathering to handle on Android.

Package name: `com.monarchprime.pin`. Product ID:
`com.monarchprime.pin.premium.lifetime` (Lifetime Premium, the same ID as on
iOS; the code asks Google Play for it).

## How 2.0 is sold (same as iOS, decided 2026-11-15)

- **One one-time purchase: Lifetime Premium, $19.99.** No subscriptions, no
  trial, no offer codes. The paywall lists only what `OFFERED_PLANS` in
  `src/lib/store/constants.ts` names.
- **New free users can save 30 entries** (`FREE_LOG_LIMIT` in
  `src/lib/freeTier.ts`). Premium unlocks unlimited entries plus lab results,
  full heat-map history, unlimited plans, insights, photo compare and PDF
  reports. Saved records always stay viewable, editable and exportable.
- **Free:** 2 active plans with reminders, vials, calendar, photos, the
  worksheet, CSV export and backup.
- **Founders:** nobody has used or bought the Android app, so every Android
  user starts as a new user. Do not create `com.monarchprime.pin.pro.lifetime`
  on Google Play; it only exists for iOS buyers from 1.x.
- **Onboarding** ends with an optional first reminder. On Android 13 and
  later this is where the notification permission prompt appears.

## What the app does differently on Android

- **No Apple Health.** The Settings card is hidden (`healthSupported()` is
  false). Health Connect could come later.
- **Reminders are local notifications** on their own channel. Android may
  deliver them a few minutes late to save battery; the app does not ask for
  the exact-alarm permission, which Google reserves for alarm and calendar
  apps.
- **Purchases go through Google Play.** The paywall's restore message and
  the share card say "Google Play" instead of "App Store".

## Order of work

1. **Payments profile.** Play Console → Settings → Payments profile. It
   must exist before you can create a paid product.
2. **First build.** Codex runs the Android build (prompt below) and gives
   you the `.aab` file.
3. **Internal testing release.** Testing → Internal testing → Create new
   release → upload the `.aab`. Add yourself (and Codex's test account) as
   testers. Google needs one uploaded build before it lets you create the
   in-app product.
4. **In-app product.** Monetize with Play → Products → One-time products →
   Create: ID `com.monarchprime.pin.premium.lifetime`, name "Lifetime
   Premium", price $19.99, then Activate. Add the description in English,
   Spanish and Portuguese.
5. **License testers.** Settings → License testing → add the tester Gmail
   accounts. Their purchases are free test purchases.
6. **App content** (Policy → App content). Answers below.
7. **Store listing** (Grow → Store presence → Main store listing). Text
   below; graphics list below.
8. **Production.** Production → Create new release → promote the tested
   build from Internal testing → Send for review. First reviews of a new
   app usually take a few days.

## App content answers

| Section | Answer |
| --- | --- |
| Privacy policy | Same URL as on the App Store. |
| App access | All functionality is available without special access. (No account; Premium is a normal one-time purchase.) |
| Ads | No, the app does not contain ads. |
| Content rating | Category: "All other app types". Answer drug references **Yes** (the app is a log of substances people take), everything else No. Expect a Mature/18+ style rating. |
| Target audience | **18 and over** only. Not designed for children. |
| News app | No. |
| Data safety | **No data collected, no data shared.** Records, photos and settings stay on the device; nothing is sent to us. Purchases are handled by Google Play. No account, so no account deletion section. |
| Health apps | Declare the health features: medication or treatment tracking (a personal log). Not a medical device, no diagnosis or treatment advice. |
| Government apps / Financial features | No / None. |

The Data safety answer holds only while the app has no analytics SDK, no
crash reporter that uploads data and no cloud sync. Re-check it whenever
one of those is added.

## Store listing text

Title, short description and full description are in
`replica/launch/listing.json` under `google_play` (title 17/30, short
78/80, full 1904/4000 characters). They match the Android build: no Apple
Health, 30 free entries and 2 free plans, and Premium as a one-time
purchase.

## Graphics Google requires

- App icon: 512 × 512 PNG.
- Feature graphic: 1024 × 500 PNG or JPG (no equivalent on iOS; needs making).
- Phone screenshots: at least 2, ideally 4 to 8, taken from the Android
  build (the emulator works). The iOS screenshot captions in
  `docs/APP_STORE_LISTING.md` can be reused.

## Codex prompt: build and test on the emulator

```
Monarch Prime Pin 2.0, Android. Work from the latest main. Make no code changes; report anything broken.
Read docs/GOOGLE_PLAY_LAUNCH.md first. Sold the same way as iOS: one one-time Lifetime Premium ($19.99),
no subscriptions, 30 free entries for new users.
1. git checkout main && git pull
2. npm ci, npx tsc --noEmit, npm test, node scripts/check-i18n.js, node scripts/test-heat.js, npx expo-doctor. All must pass.
3. eas build:version:get --platform android  (report the versionCode)
4. Emulator smoke test:
   eas build --platform android --profile android-emulator
   Install the APK on an Android 14 emulator with Google Play (Pixel 7 image) and check:
   - First launch asks only for a name. Onboarding has 3 steps; the last, "Want a reminder?",
     takes a compound, a typed amount, how often and a time. "Turn On Reminder" shows the
     notification permission prompt; allow it. "Skip for now" also works (test on a second install).
   - Tools > Protocols shows the plan from onboarding with reminders on. A third active plan
     shows the "Two free protocols" prompt.
   - Protocols > Send a Test Reminder: a notification arrives. A plan reminder set 2 minutes ahead
     arrives (a few minutes late is acceptable); tapping it opens the log screen for that dose.
   - Log entries with sites. From the 25th entry a note under Save counts down the free entries
     left; the 31st shows "You've used your 30 free entries" with See Premium. (A backup file with
     28 sample entries, restored in Settings, gets there faster.)
   - The paywall lists only "Lifetime" with a one-time price; Restore Purchases says Google Play.
     Settings has no Apple Health card. The share card says "on Google Play".
   - Take portrait screenshots for the store: Home, Log, History, Protocols, the onboarding reminder.
5. Store build: eas build --platform android --profile android-production
   Download the .aab. Do not submit it; the owner uploads it in Play Console.
6. After the owner creates the Lifetime Premium product and adds license testers: install the
   internal-testing build with a tester account, buy Lifetime Premium (a free test purchase),
   check that unlimited entries and the Premium features unlock, uninstall, reinstall,
   and check that Restore Purchases brings Premium back.
7. Report: versionCode, test results, the .aab path, and the screenshots.
```
