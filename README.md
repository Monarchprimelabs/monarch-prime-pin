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

## Current Known Status

- This is a production-sensitive app. Treat release behavior, entitlements, legal copy, and pricing logic as frozen unless explicitly approved.
- Verified on June 25, 2026: the live App Store listing shows `version 1.1.1`, and the App Store Connect build activity screenshot shows build `15`.
- The matching local App Store-preserved source exists at Git commit `3b9e772` and in the archive `Desktop/Monarch Prime Pin/MonarchPrimePin-v1.1.1-AppStore-preserved-HEAD-3b9e772.zip`.
- This project uses Expo/EAS remote app versioning (`eas.json` has `appVersionSource: remote` with `autoIncrement: true`), so the iOS build number is not stored in `app.json`. That is why the verified source shows `1.1.1` locally while App Store Connect shows `1.1.1 (15)`.
- The current working branch in this folder is ahead of that release and currently declares `version 1.1.0` in `app.json`, so it should not be treated as the production baseline.
- The app currently supports offline-first local usage. Cloud/auth code exists in the repo, but it should not be expanded or reworked without approval.
- There is already local git history in this folder, but no GitHub remote is configured.

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
