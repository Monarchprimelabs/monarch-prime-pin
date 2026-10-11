# Releasing Monarch Prime Pin

Builds run on **Expo's servers**, not on any Mac. A Mac is only ever needed
for the one-time interactive Apple credential setup (already done — the
distribution certificate and provisioning profiles live on EAS).

## Normal release (no computer required)

Use the **Release iOS** workflow (`.eas/workflows/release-ios.yml`). On
expo.dev, open the project's **Workflows** page and run it. It builds with
the `ios-production` profile and submits the result to App Store Connect as
one unit.

**The expo.dev Builds page has no submit button** — its "Submit to an app
store" dialog only prints the `eas submit` CLI command, which is useless
without a computer. That is why the workflow exists; do not plan a release
around submitting from the build page.

### Build only, from the Builds page

**Create a build** → branch `main`, platform **iOS**, profile
**`ios-production`**. Confirm the commit in the header before walking away.
Note this leaves the build unsubmitted.

> **The profile matters.** `ios-production` sets
> `EXPO_PUBLIC_MONETIZATION_ENABLED=true`; the plain `production` profile
> does not, and a build made with it ships with in-app purchases disabled —
> nobody can buy Pro. Always confirm the profile reads `ios-production`.

### Alternative: trigger from a pull request

With the GitHub App connected, applying a label of the form
`eas-build-[platform]:[profile]` to a PR starts a build of that PR — e.g.
`eas-build-ios:ios-production`. Useful when the build needs to be kicked
off from somewhere without the expo.dev UI handy.

### Alternative: CLI

From any machine with the repo checked out and an authenticated EAS CLI:

```
npx eas-cli build --platform ios --profile ios-production
npx eas-cli submit --platform ios --profile ios-production --latest
```

## Version numbers

`eas.json` sets `appVersionSource: remote` with `autoIncrement`, so the
**build number is assigned by EAS** and must never be hand-edited. Only the
user-facing version (`expo.version` in `app.json`) is edited by hand.

**One build, one upload.** Each build can go to App Store Connect exactly
once. `eas build --auto-submit` and the Release iOS workflow already upload
it, so never follow either with `eas submit` for the same build. Version
1.8.0 build 36 was uploaded twice this way (October 2026): Apple kept the
first upload and emailed ITMS-90189 "Redundant Binary Upload" for the
second. That email is harmless, but it means a submit step ran one time too
many. Before submitting by hand, check App Store Connect → TestFlight: if
the build number is already listed, it is already uploaded.
`eas build:version:get --platform ios` shows the last build number EAS
assigned; the next build gets that number plus one.

## Before spending a build

Run the mechanical gates locally:

```
npx tsc --noEmit
npm test                      # Jest, run under UTC, New York and Tokyo
node scripts/test-heat.js     # expect "29 passed, 0 failed"
node scripts/check-i18n.js    # EN/ES/PT key and placeholder parity
npx expo-doctor               # needs network; must pass all checks
```

Then walk `docs/AUDIT_CHECKLIST.md`. Section 7 matters specifically when any
native/extension target is involved: verify entitlements on the **built
artifact**, never by reading plugin source.

## History worth remembering

The home-screen widget was removed in 1.7.0 after three builds could not get
it reading shared app-group data on device, despite entitlements, profiles,
and native module linking all verifying clean. If it is ever revisited, do it
with Xcode on a Mac for real on-device debugging rather than blind builds.
The orphaned `com.monarchprime.pin.widget` identifier, its profiles, and the
`group.com.monarchprime.pin` app group still exist in the Apple Developer
account and can be reused.
