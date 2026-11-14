# Prompt for Codex: get Monarch Prime Pin 2.0 submitted for App Review

Paste everything below the line into Codex on the Mac mini, with its full computer-access mode on.

---

You are finishing the App Store release of **Monarch Prime Pin 2.0** (iOS, bundle ID `com.monarchprime.pin`, App Store app ID `6770808426`). The code is done and merged. Your job is the release work: the last few code constants, the in-app purchases in App Store Connect, the build, the listing, and the submission for review.

## How you work on this Mac

- **Use Safari for App Store Connect** (appstoreconnect.apple.com). The Apple ID sign-in is saved in Safari on this Mac and fills in automatically. Do not use Chrome or another browser for it. If Apple asks for a two-factor code, stop and ask me for it.
- **Check for an App Store Connect API key before clicking through pages.** Look in `~/.appstoreconnect/private_keys`, `~/.private_keys`, `~/Downloads` (files named `AuthKey_*.p8`), any `fastlane` folder, and `eas credentials`. If one exists, use it for whatever the API supports (products, prices, localizations, selecting the build) and use Safari for the rest. If none exists, do everything in Safari. Never print a key, paste one into a file in the repo, or commit one.
- The repo is `Monarchprimelabs/monarch-prime-pin`. Clone or pull it and work from the latest `main`.
- Only touch Monarch Prime Pin. This Mac and these accounts also hold other projects and apps; leave them alone.
- Never push to `main` directly and never force-push. Code changes go on a branch with a pull request.

## Read these first

`docs/REVIEW_NOTES.md`, `docs/APP_STORE_CONNECT_CHANGES.md`, `docs/APP_STORE_LISTING.md`, `docs/RELEASE_CHECKLIST.md`, `docs/RELEASING.md`, `docs/PRIME_PIN_V2_HANDOFF.md` and `src/lib/store/constants.ts`. They are the source of truth. If this prompt and a doc disagree, tell me before acting.

## Ask me these once, up front, then keep going

1. **Founder offer code:** do I want one for 2.0? If yes, the code word, the price for the first year, how many redemptions, and the end date. If no, the founder-code sentence comes out of the review notes and `FOUNDER_CODE` stays empty.
2. **Privacy policy URL:** confirm it is `https://monarchprimelabs.github.io/apps/monarch-prime-pin/privacy.html`, and that the page mentions Apple Health as `docs/APP_STORE_CONNECT_CHANGES.md` describes.
3. **Prices:** confirm monthly $4.99 with the first month at $0.99, annual $39.99 with a 1-week free trial, lifetime $79.99.

## Step 1: the last code constants

In `src/lib/store/constants.ts`, on a branch:

- `PRIVACY_URL`: the confirmed privacy policy URL.
- `FOUNDER_CUTOFF`: the planned 2.0 release date.
- `PAID_APP_FREE_DATE`: the day the app's price changed to Free. Find it in App Store Connect under Sales and Trends (the last day with paid downloads) or the pricing history. If unsure, pick the later date; a too-early date misses people who paid.
- `FOUNDER_CODE`: the code word from my answer, or leave it empty.

Run `npx tsc --noEmit`, `npm test` and `node scripts/test-heat.js`. Open a pull request, wait for its checks, and ask me before merging.

## Step 2: in-app purchases in App Store Connect

First check that the Paid Apps agreement, banking and tax forms are active; subscriptions cannot be submitted without them. If they are not, stop and tell me.

Create these, matching the IDs in `constants.ts` exactly:

| Product | ID | Type | Price | Offer |
|---|---|---|---|---|
| Premium Monthly | `com.monarchprime.pin.premium.monthly` | Auto-renewable, 1 month | $4.99 | Introductory offer: pay as you go, $0.99 for 1 month, new subscribers |
| Premium Annual | `com.monarchprime.pin.premium.annual` | Auto-renewable, 1 year | $39.99 | Introductory offer: free trial, 1 week, new subscribers |
| Lifetime Premium | `com.monarchprime.pin.premium.lifetime` | Non-consumable | $79.99 | none |

- Both subscriptions go in one subscription group named **Monarch Prime Pin Premium**, at the same level of service.
- Add the display name and description for each product and for the group in English, Spanish and Portuguese (the app ships in those three).
- Add the review screenshot each product needs: a screenshot of the paywall.
- Turn on **Billing Grace Period**.
- If I asked for a founder code, create it as a custom offer code on the annual plan.
- **Leave the old product `com.monarchprime.pin.pro.lifetime` exactly as it is.** Do not change its price or remove it from sale now; that happens after 2.0 is approved.
- Attach the three new products to the 2.0.0 version so they go to review with it.

## Step 3: the build

After the Step 1 pull request is merged, start the build by bringing `main` into the `release/ios` branch and pushing it (`git checkout release/ios && git merge origin/main && git push origin release/ios`). That triggers the EAS workflow, which builds with the `ios-production` profile and sends the build to App Store Connect. Watch it at expo.dev under the project's Workflows. The free-tier queue can take 30 to 60 minutes. When the build finishes processing in App Store Connect, select it on the 2.0.0 version page and answer the export-compliance question.

## Step 4: the 2.0.0 version page

Follow `docs/APP_STORE_LISTING.md` and `docs/APP_STORE_CONNECT_CHANGES.md`:

- Description, promotional text, keywords and What's New in each language the docs give.
- Screenshots: follow the screenshot rules in `docs/APP_STORE_LISTING.md` (made-up sample records, no worksheet, no amounts that read as dose advice). Take them from the 2.0 build. If you cannot produce them on this Mac, stop and tell me exactly which sizes are missing.
- Age rating: answer the questionnaire so the app is 18+.
- Privacy policy URL, and check the App Privacy answers still say no data is collected.
- App Review Information: **Sign-in required: No.** Paste the notes block from `docs/REVIEW_NOTES.md`, with prices checked against what you created and the founder-code sentence removed if there is no code.

## Step 5: check, then submit

Before submitting, give me a short summary:

- every product with its ID, price, offer and status
- the build number selected
- anything on the version page still showing a warning
- anything you could not do, and why

Then **wait for me to reply "submit"**. When I do, add the version for review, submit, and confirm the status reads "Waiting for Review".

## Rules that always apply

- No dosing wording anywhere in the listing: no "dose calculator", no recommended amounts (App Store guideline 1.4.2).
- Do not hardcode prices in the app; it reads them from the store.
- If a step fails twice, stop and tell me what you saw instead of trying workarounds.
- At the end, write what you did into `docs/PHASE_HISTORY.md` in a pull request.
