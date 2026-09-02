# Localization: app binary + App Store listing

> **Before running `metadata:push`:**
> 1. The privacy-policy URL in `store.config.json`
>    (`https://monarchprimelabs.github.io/apps/monarch-prime-pin/privacy.html`)
>    must already host the **final, approved** policy. App Store Connect
>    stores the URL, not the page, and App Review opens it.
> 2. Run `npx eas-cli metadata:pull -e ios-production` **first**. It rewrites
>    `store.config.json` with what is live today (copyright, categories,
>    review contact, current URLs, the en-US text). Merge the `es-MX` and
>    `pt-BR` blocks from this branch into that pulled file, then lint and
>    push. Pushing this file as-is would overwrite live values with guesses
>    (`copyright` is one) and drop anything the file does not mention.

## What is declared, and why there are two halves

The App Store decides what a Spanish- or Portuguese-language user sees from
two independent sources. Both have to be in place; either one alone changes
nothing visible to those users.

| Surface | Comes from | Declared in |
| --- | --- | --- |
| Product page **Languages** row, language-based ranking, and the iOS **camera / photo permission alerts** | the **binary** — its `.lproj` folders and Info.plist | `app.json` → `expo.locales` + `ios.infoPlist` (`CFBundleDevelopmentRegion`, `CFBundleLocalizations`, `CFBundleAllowMixedLocalizations`) and the three files in `locales/` |
| Listing **text** shown to the viewer (name, subtitle, promo text, description, keywords, what's new) | **App Store Connect localizations** — one per language, matched to the viewer's device language | `store.config.json` (`apple.info.en-US` / `es-MX` / `pt-BR`), pushed with `eas metadata`, or entered by hand |

The in-app UI has spoken English, Spanish and Brazilian Portuguese for a
while (`src/lib/i18n.tsx`), but JavaScript string tables are invisible to
the store. Until the binary declares localizations, Apple lists the app as
English-only and shows the English permission prompts to everyone.

### The binary (`app.json`, `locales/`)

- `expo.locales` maps `en`, `es`, `pt-BR` to `locales/<lang>.json`. At EAS
  build time the Expo prebuild writes `en.lproj`, `es.lproj` and
  `pt-BR.lproj/InfoPlist.strings` from them. `es` with no region is
  deliberate: it matches es-MX, es-US and es-ES devices alike. `pt-BR`
  matches the app's Brazilian copy.
- Each locale file only carries the three permission strings under an `ios`
  key, so nothing spills into Android `strings.xml`.
- `CFBundleLocalizations` is redundant with the `.lproj` folders but makes
  the declaration explicit and reviewable here.
  `CFBundleAllowMixedLocalizations: true` lets Apple-framework UI (photo
  picker, share sheet, alert buttons) follow the device language.
- The English strings already in `ios.infoPlist` and the `expo-image-picker`
  plugin props stay as the base (development-region) values.
- `LanguageProvider` now seeds its first render from
  `detectDeviceLanguage()` instead of `'en'`, so there is no one-frame
  English flash before the stored preference (which still wins) is read.

**A new EAS build (profile `ios-production`, as always) is required** for
any of this to reach the store. Nothing here changes a build that already
shipped.

### The listing (`store.config.json`)

`store.config.json` is the `eas metadata` store configuration. It holds
`en-US`, `es-MX` and `pt-BR` blocks, each with title, subtitle, promo text,
keywords, description, release notes and the privacy-policy URL. All fields
were sized against App Store Connect limits (title/subtitle 30, promo 170,
keywords 100 joined, description/what's new 4000) and the file passes
`eas metadata:lint`.

Localized **keywords** are the concrete discoverability gain: each
localization gets its own 100-character keyword budget, so ES + PT triple
the searchable surface.

Adjust before pushing:

- `releaseNotes` assumes the next version is the one that ships the
  localized binary. If ES/PT UI already shipped earlier, keep only the
  permission-prompt bullet.
- `apple.copyright` is a placeholder; `metadata:pull` replaces it with the
  live value.
- Add `supportUrl` / `marketingUrl` if the live listing has them (the pull
  will show). Localized screenshots can come later — a localization with
  none falls back to the en-US set.

## EAS commands (submit profile `ios-production`, ASC app 6770808426)

```
npx eas-cli metadata:pull -e ios-production     # snapshot the live listing into store.config.json — do this first
#   merge the es-MX and pt-BR blocks from this branch into the pulled file
npx eas-cli metadata:lint --profile ios-production
npx eas-cli metadata:push -e ios-production     # uploads all three localizations
```

`eas metadata` is labelled beta by Expo. It needs an authenticated EAS CLI
and an App Store Connect login; run it from a machine with the repo checked
out (see `docs/RELEASING.md` for the `npx eas-cli` pattern). Version-level
fields (description, keywords, what's new) only save to a version that is
still editable, so create the next version in App Store Connect before
pushing, then attach the localized build to it and submit both together.

## Manual App Store Connect checklist (if you prefer the UI)

1. Sign in to App Store Connect → **My Apps** → **Monarch Prime Pin**
   (ASC App ID 6770808426).
2. Create the next version if it does not exist yet (**+ Version or
   Platform** → iOS), because description / keywords / screenshots are only
   editable on an editable version.
3. On the version page (**App Store** tab), open the **localization
   dropdown** top-right (currently "English (U.S.)") → **Add Localization**
   → tick **Spanish (Mexico)** → Add. Repeat for **Portuguese (Brazil)**.
4. Switch the dropdown to **Spanish (Mexico)** and fill Name, Subtitle,
   Promotional Text, Description, Keywords and What's New from the `es-MX`
   block of `store.config.json`; set the Support / Marketing / Privacy
   Policy URLs (App Information → Localizable Information also takes the
   localized Name / Subtitle / Privacy Policy URL). **Save**.
5. Repeat step 4 for **Portuguese (Brazil)** with the `pt-BR` block.
6. Screenshots: upload localized sets per localization if you have them;
   otherwise leave empty and Apple shows the English set.
7. In **App Information**, confirm **Primary Language** is still
   English (U.S.) — do not change it.
8. Attach the new EAS build made from this branch's `app.json` (so the
   Languages row updates at the same time), then **Add for Review** →
   **Submit**.
9. After approval, spot-check on an iPhone with Spanish and then Portuguese
   first in Settings → General → Language & Region: the product page should
   render in that language and the Languages row should list three
   languages. Also confirm the camera and photo permission alerts appear
   localized the first time they fire.
10. From then on, keep `store.config.json` in the repo and use
    `metadata:pull` / `metadata:push` so the three localizations stay in
    sync every release.

## Not yet verified on a device

- The exact wording of the localized permission alerts and the effect of
  `CFBundleAllowMixedLocalizations` on the photo picker / share sheet.
- Whether iOS's per-app language override (which appears in Settings once
  the bundle declares localizations) is reflected in the `AppleLocale`
  value `detectDeviceLanguage()` reads first. If not, a user who sets a
  per-app language still gets the device-wide language until they use the
  in-app picker.
