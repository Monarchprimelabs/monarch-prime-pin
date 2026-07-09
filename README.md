# Monarch Prime PIN

Monarch Prime PIN is a research tracking and logbook app built with Expo and React Native.

## Stack

- App type: Expo-managed React Native app
- Framework: Expo SDK 54, React Native 0.81, React 19
- Language: TypeScript
- Package manager: npm
- Optional capabilities already present in code: local notifications, IAP, optional Supabase integration

## Install Dependencies

```bash
npm install
```

## Run Locally

```bash
npm run start
npm run ios
npm run android
npm run web
```

Optional monetization QA mode:

```bash
npm run start:paywall
```

## Test

There is no automated test suite configured yet.

Recommended local validation:

```bash
npx expo-doctor
npx tsc --noEmit
```

Then smoke test sign-in flow, offline logging, history, analytics, settings, notifications, and monetization gates on device.

## iOS Release (EAS)

This app ships to the App Store via EAS. Run these where you are logged in to Expo (`eas login`):

```bash
# Monetized App Store / TestFlight build (paywall ON)
eas build --platform ios --profile ios-production

# Upload the finished build to App Store Connect / TestFlight
eas submit --platform ios --profile ios-production
```

- Use the **`ios-production`** profile for App Store builds. It sets `EXPO_PUBLIC_MONETIZATION_ENABLED=true` (free tier of two records, then `$4.99` Lifetime Pro). The plain `production` profile leaves monetization off and is not the iOS release profile.
- Build numbers are remote and auto-incremented; do not bump them in `app.json`.
- `submit` targets ASC App ID `6770808426` (`com.monarchprime.pin`).
- Before flipping the live App Store price to Free, confirm the non-consumable IAP `com.monarchprime.pin.pro.lifetime` is approved in App Store Connect, then verify grandfathering and purchase in TestFlight. See `docs/app-store-phase-2.md`.

## Current Known Status

- This is a production-sensitive app. Treat release behavior, entitlements, legal copy, and pricing logic as frozen unless explicitly approved.
- Verified on June 25, 2026: the live App Store listing shows `version 1.1.1`, and the App Store Connect build activity screenshot shows build `15`.
- The matching local App Store-preserved source exists at Git commit `3b9e772` and in the archive `Desktop/Monarch Prime Pin/MonarchPrimePin-v1.1.1-AppStore-preserved-HEAD-3b9e772.zip`.
- This project uses Expo/EAS remote app versioning (`eas.json` has `appVersionSource: remote` with `autoIncrement: true`), so the iOS build number is not stored in `app.json`. That is why the verified source shows `1.1.1` locally while App Store Connect shows `1.1.1 (15)`.
- The working branch declares `version 1.1.1` in `app.json`, matching the live App Store baseline at commit `3b9e772`. The next `ios-production` EAS build auto-increments the remote build number (App Store Connect shows `1.1.1 (15)`, so the next build is `(16)`).
- The app currently supports offline-first local usage. Cloud/auth code exists in the repo, but it should not be expanded or reworked without approval.
- This project has a GitHub remote configured (`monarchprimelabs/monarch-prime-pin`); push feature work to a branch and open a PR rather than committing to `main`.

## Docs

- `docs/PROJECT_HANDOFF.md`
- `docs/PHASE_HISTORY.md`
- `docs/AGENT_RULES.md`
- `docs/RELEASE_CHECKLIST.md`
- `docs/app-store-phase-2.md`

## Compliance Note

This application is intended for research logging and record-keeping. Preserve the current legal/compliance posture unless changes are explicitly approved.

**SAVE INJECTION button shows error**
- This means a required field is missing (peptide, dose, or site). The button validates first.

**Want to clear all test data?**
- Sign Out from Settings → Reminders, OR
- Delete and reinstall the app

## License

Proprietary — Monarch Prime Labs. All rights reserved.

## For Research Use Only

This application is intended SOLELY for research data logging. The compounds referenced are NOT approved for human consumption by any regulatory authority. See the Legal tab in Settings for full disclaimer.
