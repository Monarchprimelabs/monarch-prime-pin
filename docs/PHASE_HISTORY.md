# Monarch Prime PIN Phase History

## Provenance Markers

1. Verified live App Store version on June 25, 2026: `1.1.1 (15)`
2. Matching local App Store-preserved commit: `3b9e772`
3. Matching local archive: `MonarchPrimePin-v1.1.1-AppStore-preserved-HEAD-3b9e772.zip`
4. Existing checked-out working branch metadata: `version 1.1.0`
5. Existing historical project notes: `v1.0.5` build `9` was the earlier approved paid App Store release

## Current Interpretation

- There are multiple meaningful release baselines in circulation, but the current live App Store baseline is now verified as `1.1.1 (15)`.
- The checked-out working branch is not the exact App Store branch and should be treated as post-release or transition work.
- Preserve commit `3b9e772` as the GitHub import baseline for production history. The build number `15` is supplied by Expo/EAS remote versioning rather than stored in `app.json`.

## Feature-State Notes

- Offline-first local logging is an important stability baseline.
- Optional cloud/auth support exists in code but should remain frozen unless approved.
- Monetization and entitlement logic are already in the codebase and require careful review before any release changes.
