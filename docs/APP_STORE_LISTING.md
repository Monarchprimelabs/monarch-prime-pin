# App Store listing: Monarch Prime Pin (personal-log release)

Copy each block into App Store Connect. Every field passed `listing.py` (store limits, ranking or price claims in short fields, emoji, and no competitor names). The description mentions Apple Health, so publish it with the release that includes PR #24. Before then, delete that one line.

## Name (30)
```
Monarch Prime Pin
```

## Subtitle (30)
```
Private injection & site log
```

## Promotional text (170)
```
New: plans with reminders, a Today view, vial tracking and Apple Health weight. Your records stay on your phone, with no account and no tracking.
```

## Keywords (100, comma-separated, no spaces)
```
peptide,tracker,shot,reminder,schedule,vial,rotation,diary,body,map,glp-1,history,weight,journal
```
Words already in the name and subtitle ("monarch", "prime", "pin", "private", "injection", "site", "log") are left out because Apple already indexes them. Nothing promises dosing ("dose calculator", "dosage"), per guideline 1.4.2.

## Description (4000)
```
Monarch Prime Pin is a private log for the injections you plan and take. Set up a plan once, get a reminder at the time you chose, log it in a couple of taps, and see where you injected last.

Everything stays on your phone. There is no account to create, no cloud copy and no ad tracking.

PLAN AND REMINDERS
• Protocols with daily, every other day, twice a week, days on and off, specific days or every N days, plus optional cycles
• Up to four times a day, with reminders at the times you set
• Today's plan shows what you planned, what you logged and what you skipped, with a week strip and your progress so far
• Edit a plan without changing your past records

LOGGING
• Log a planned entry in a couple of taps: compound, amount and time are already filled in
• mcg, mg, IU or mL
• Backdate or edit any record
• Side-effect notes, severity, weight and progress photos

INJECTION SITES
• Front and back body map
• Heat map of the sites you've used recently
• See when each site was last logged before you pick it

VIALS
• Track what's left in each vial from the doses you log
• See how far a vial covers your plan, with an alert a week before it runs short

REPORTS AND TOOLS
• Weekly and monthly summaries, site usage and weight trend
• Concentration worksheet with syringe sizes: unit conversion on the numbers you enter
• Optional Apple Health: read your weight and body fat (read-only)
• Export every record to CSV, or back up everything (photos included) to a file you keep

PRICING
Start free with 5 saved logs. Monarch Pro is a one-time purchase that unlocks unlimited logs, protocols and reminders, vials, reports, the worksheet, the calendar and the photo gallery. No subscription.

Monarch Prime Pin is a personal log for adults. It does not give medical advice, and it never suggests or calculates a dose: every amount comes from you. Talk to a licensed clinician about anything you take.
```

## What's New
```
• Protocols: plan days and times, with reminders
• Today's plan: log or skip planned entries, see your week
• Vials: what's left and how far it covers your plan
• See when each site was last logged
• Optional Apple Health weight and body fat (read-only)
• Photos are now kept safely through app updates, and backups can include them
• CSV export includes plans, vials and skipped entries
• Syringe sizes in the concentration worksheet
• Clearer wording: a personal log, not medical advice
• No account needed: your records stay on this phone
```

## Fact check (every claim is backed by the code)
- No account, no cloud, records stay on the phone: Supabase isn't configured; data is in AsyncStorage (src/lib/storage.ts).
- No ad tracking: no analytics or attribution SDK in package.json; funnel counters are local (src/lib/funnel.ts).
- 5 free logs, one-time Pro: FREE_INJECTION_LIMIT = 5 and the lifetime product (src/lib/entitlements.native.tsx). No price in the text, because it varies by country.
- Pro list matches the gates in ToolsScreen (protocols, vials, worksheet, schedule, inventory, templates), BottomTabs (reports) and HistoryScreen (calendar, photo gallery). Export and backup stay free.
- Never suggests a dose: amounts start empty everywhere; the worksheet is unit conversion only.

## Also in App Store Connect
See docs/APP_STORE_CONNECT_CHANGES.md: 18+ age rating, screenshots without the old banner, privacy label, privacy-policy line for Apple Health, review notes.

Google Play text is in replica/launch/listing.json, for if the Android app ships (not confirmed).

## Screenshot captions

The first three screenshots carry the listing, because they are all most people see in search. Each caption is a short headline and an optional smaller line, written to sit above a real screen from this build. Use the order below.

| # | Screen to capture | Headline | Smaller line |
| --- | --- | --- | --- |
| 1 | Home: Today's plan, week strip, two planned cards (one Logged, one Planned) | Your plan, every day | See what's planned, logged and skipped this week |
| 2 | Log screen opened from a planned entry, site picked, "last logged" line visible | Log it in a couple of taps | Compound, amount and time are already filled in |
| 3 | Home: site heat map, front view, a few bands lit | Know where you went last | Recent sites at a glance, and when each was last used |
| 4 | Protocol builder: Days on / off picked, cycle on, summary line showing | Any schedule you follow | Every other day, 5 on / 2 off, specific days, cycles |
| 5 | Lock screen with a "Protocol reminder" notification | Reminders at your times | Private: they never show what you take |
| 6 | Vials: one vial card with the remaining bar and "covers entries through" | Know when a vial runs low | What's left, and how far it covers your plan |
| 7 | Reports: weekly summary and weight trend "from Apple Health" | Your history, clearly | Summaries, site usage and weight from Apple Health |
| 8 | Settings: data card ("Everything you log stays on this phone") with Export and Backup | Stays on your phone | No account. No cloud. No ad tracking. Export anytime. |
| 9 | Upgrade screen | Pay once. No subscription. | Start free with 5 logs. Pro is a one-time purchase. |

### Rules for the screenshots

- **No old banner.** Capture from the PR #24 build, so the banner reads "PERSONAL LOG — Not medical advice". Leave it visible; it helps in review.
- **Sample data:** use a test install with made-up records. Amounts in screenshots can read as dose advice (guideline 1.4.2), so:
  - keep amounts small and varied rather than showing one "standard" number many times
  - leave the concentration worksheet out of the screenshots entirely
  - never put an amount in a caption
- **No brand-name drugs** (Ozempic, Mounjaro and so on) on screen or in captions. Use peptide names from the built-in list, or a custom name.
- **No faces or real people**, and no other app's name, icon or look.
- **Sizes:** App Store Connect asks for the 6.9-inch iPhone set (1320 × 2868) and scales it for smaller phones. Check the upload page, because the required sizes change. The app is iPhone-only (`supportsTablet: false`), so no iPad set.
- **Light or dark:** pick one for all nine so they look like a set. Dark matches the app icon.
- **Screenshot 7 needs Apple Health** (PR #24). If that release ships without it, swap the smaller line for "Weekly summaries, site usage and weight trend".
