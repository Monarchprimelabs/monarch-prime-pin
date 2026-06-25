# Monarch Prime PIN Release Checklist

## Before Opening a PR

1. Confirm no secrets, signing files, archives, or generated folders are staged.
2. Run `npm install` or `npm ci`.
3. Run `npx expo-doctor`.
4. Run `npx tsc --noEmit`.
5. Smoke test sign-in, offline logging, history, analytics, settings, and any affected IAP or notification paths.

## Before Tagging a Stable Baseline

1. Use commit `3b9e772` as the verified `1.1.1 (15)` App Store baseline unless a newer live release is confirmed.
2. Confirm the branch being tagged points to the exact App Store source of truth.
3. Remember that iOS build numbers are managed remotely through Expo/EAS for this project, so App Store Connect may show a build number that is not present in `app.json`.
4. Remove tracked archives from Git history or index before pushing to GitHub.
5. Update `docs/PHASE_HISTORY.md` and `docs/PROJECT_HANDOFF.md`.
6. Create the stable tag only after provenance is confirmed.

## Before Store Release Work

1. Confirm version and build numbers are intentional.
2. Confirm entitlement, IAP, and App Store rollout assumptions match `docs/app-store-phase-2.md`.
3. Confirm legal/compliance copy was not changed without approval.
