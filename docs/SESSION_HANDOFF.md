# Session handoff, 2026-11-14

For whoever picks this project up in a new session. Read this, then `docs/PROJECT_HANDOFF.md`.

## Where things stand

- **iPhone app 2.0:** merged to `main`. PRs #26 (2.0), #27 ($0.99 first month), #28 (weight trend fix, ask-once Apple Health, SS-31 and more compounds, more motion) are in. A TestFlight build was started from `release/ios` on 2026-11-12.
- **Web app:** every tool is open on web, records stay in the visitor's browser. The **Learn** research library (16 compounds, each claim sourced) is web only (PR #29).
- **Website:** `npm run build:site` builds the marketing page at `/` and the web app at `/app` into `site-dist/` (PRs #31, #32). It is live at https://monarch-prime-pin.monarch-prime-pin.workers.dev on Cloudflare, in the Monarch Prime Labs account, deployed by hand with `npx wrangler deploy` (config in `wrangler.jsonc`).
- **Expo web deploy** (`.eas/workflows/deploy-web.yml`, branch `release/web`) exists but is not the live site.

## Pricing (decided 2026-11-15)

- One one-time purchase, Lifetime Premium at $19.99; no subscriptions in 2.0 (`OFFERED_PLANS` in `src/lib/store/constants.ts`).
- New free users get 30 entries (`FREE_LOG_LIMIT` in `src/lib/freeTier.ts`); Premium and every founder log without a limit.
- Onboarding ends with an optional first-plan reminder (iPhone and Android only).

## Moving data between the web app and the apps

The backup file (Settings > Data) is one format everywhere: the web app downloads it and opens it from the browser's file chooser; the iPhone and Android apps share it and open it from Files. Photos and saved lab report pages travel inside it. Moving is one-time and manual: nothing syncs. Live sync would need accounts and a server; see `docs/cloudsync-plan.md`.

## Open items

1. **Domain:** `monarchprimepin.com` was bought in the Cleanspace Cloudflare account by mistake. It can move to the Monarch account once it is more than 10 days old (from about 2026-11-23): Manage Domain > Configuration > Start, with the Monarch account ID. Then attach it under the Worker's Settings > Domains & Routes.
2. **Automatic website updates:** connect the repo in Cloudflare (Worker > Settings > Builds; build command `npm run build:site`, deploy command `npx wrangler deploy`). Until then the site only changes on a manual deploy.
3. **Cloudflare API token:** one was pasted into chat on 2026-11-12 and should be rolled.
4. **App Store submission:** the Mac mini prompt on the "Prime Pin Handoff" page drives App Store Connect in Safari. In `src/lib/store/constants.ts`, `TERMS_URL` and `PRIVACY_URL` point to the GitHub Pages terms and privacy pages, and `FOUNDER_CUTOFF` is 2026-12-01 (move it to the real release date in a later update if 2.0 ships much later). `PAID_APP_FREE_DATE` is still empty: the Mac mini prompt reports the date the price went to Free, then set it in an update.
5. **Sign-in copy on web** says "Your records stay on this phone"; it should say "this device" on web.
6. **Learn reel:** not made, because Learn is web only and the reels end on "Free on the App Store". Make it once the domain is attached.

## Marketing reels

`marketing/reels/` holds the scripts that made the commercial and seven reels:

- `record.js` records the real app (web demo build, sample data) with Playwright.
- `compose.py` assembles each reel with ffmpeg from the recordings, the generated voiceover, music and b-roll, as listed in `reels.json`.

The generated voiceovers, music and b-roll came from Higgsfield and are not in the repo; the finished videos are on the "Prime Pin Handoff" artifact page.

## Rules the owner set

- Never push to `main`, never force-push. Merging a pull request needs the owner's OK each time.
- No dosing amounts and no "this might be for you" recommendations anywhere.
- Learn stays web only and is not linked from the iPhone app.
