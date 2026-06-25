# Monarch Prime PIN Project Handoff

## Snapshot

- Project path: `/Users/georgegonzalez/MonarchPrimePin`
- App type: Expo-managed React Native app
- Framework: Expo SDK 54, React Native 0.81, React 19
- Language: TypeScript
- Package manager: npm
- Git status: existing local Git repo on branch `codex/freemium-lifetime-unlock`

## Run Commands

```bash
npm install
npm run start
npm run ios
npm run android
npm run web
```

Optional monetization QA mode:

```bash
npm run start:paywall
```

## Current Working Status

- Production-sensitive project with existing release and monetization context.
- Verified on June 25, 2026: the live App Store listing shows `version 1.1.1`, and the App Store Connect build activity screenshot shows `1.1.1 (15)`.
- Matching local App Store source: Git commit `3b9e772` on branch `codex/testflight-monetized-build`.
- Matching local archive: `/Users/georgegonzalez/Desktop/Monarch Prime Pin/MonarchPrimePin-v1.1.1-AppStore-preserved-HEAD-3b9e772.zip`
- Build-number note: this repo uses Expo/EAS remote versioning, so build `15` is managed remotely and does not appear in `app.json`.
- Current folder metadata on the checked-out working branch still shows `version 1.1.0`, so this branch is not the exact production baseline.
- No GitHub remote is configured yet.
- The current branch name suggests ongoing monetization work and should not be treated as the default import branch without review.

## GitHub Preparation Notes

- Safe to continue using as a Git repo, but unsafe to push the current branch as production before the App Store baseline is pinned separately.
- Recommended repository name: `monarch-prime-pin`
- Recommended default branch after baseline review: `main`
- Recommended first stable production tag: `monarch-prime-pin-v1.1.1-build15-appstore`

## Recommended CI Checks

- `npm ci`
- `npx expo-doctor`
- `npx tsc --noEmit`

## Immediate Risks

- A root archive file is currently tracked in Git and should be removed from version control before the first GitHub push.
- The checked-out working branch does not match the verified `1.1.1` App Store release commit.
- Auth, cloud, IAP, and entitlement-related code exists; unreviewed changes there are high risk.
