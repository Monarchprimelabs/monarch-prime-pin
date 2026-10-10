# Recon map: PeptidePal – Peptide Tracker (iOS)

Scope: the paid core loop (protocol setup, reminders, one-tap dose logging, calendar and streaks) plus the supply side that keeps people paying (vial inventory with run-out alerts, the reconstitution calculator, site rotation). Library, progress, AI, community and food tracking are mapped but ranked lower.
For: Monarch Prime Pin (MPP), George's live Expo SDK 54 peptide tracker. This is a gap map for MPP, not a brief for a second app.
Date: 2026-10-09
Target: PeptidePal – Peptide Tracker by Blank Labs LLC, App Store ID 6762102880. Not to be confused with PeptidePal LLC's clinic app (ID 6760661844) or Peptide Pal Pro (ID 6765496387).

## Terms check: public sources only

PeptidePal's Terms (last updated 2026-09-11) license the app for noncommercial use and prohibit reverse engineering, derivative works and scraping. So nobody signs up or drives an account to study it for MPP. Everything below comes from public pages: the store listing, its screenshot captions, a public onboarding teardown, the marketing site, the guides and the privacy policy. Nothing of theirs gets copied: no code, copy, library text, icons or illustrations. This is a practical reading, not legal advice.

## Why this app

Most downloaded peptide tracker found. Ratings come from the US App Store page unless the source column says otherwise, read on 2026-10-09. Download and revenue figures are third-party estimates and disagree with each other, so treat them as rough.

| app (developer) | US ratings | other signals | source |
| --- | --- | --- | --- |
| PeptidePal (Blank Labs) | 4.7★, 4.7K | 100K downloads within 90 days of an Apr 23, 2026 launch (MWM). ScreensDesign app info: 75,000 installs and $150,000 revenue a month (its header says 15K downloads and $100K). Site claims 200K+ users | [App Store](https://apps.apple.com/us/app/peptidepal-peptide-tracker/id6762102880), [MWM](https://mwm.ai/apps/peptidepal-peptide-tracker/6762102880), [ScreensDesign](https://screensdesign.com/showcase/peptidepal-peptide-tracker) |
| Pep AI (Zode Development) | 4.7★, 3.8K | ScreensDesign app info: 35,000 installs and $65,000 revenue a month (header: 15K downloads, $25K). Broader app: GLP-1, food scanning, Watch, community | [App Store](https://apps.apple.com/us/app/-/id6758682710), [ScreensDesign](https://screensdesign.com/showcase/pep-ai-peptide-glp-1-tracker) |
| Regimen (Awaken Labs) | 4.8★, 489 (MWM) | claims 25,000+ users | [MWM](https://mwm.ai/apps/regimen-peptide-tracker-trt/6753905449) |
| PepTracker | 4.7★, 175 | | [App Store](https://apps.apple.com/us/app/peptracker-dose-log/id6747189889?l=en-US) |
| PeptPro (Virex Tech) | 4.7★, 52 | | [App Store](https://apps.apple.com/app/id6764484462) |
| PepIQ (indie developer) | 5.0★, 2 | | [App Store](https://apps.apple.com/app/id6761932434) |
| PeptIQ | not shown | rating count was not shown on the pages that could be reached | [AppFollow](https://apps.appfollow.io/ios/peptiq-peptide-tracker/6757513095?country=us) |
| Shotsy (GLP-1 only) | 4.8★, 20K | bigger, but its listing never mentions peptides | [App Store](https://apps.apple.com/us/app/-/id6499510249) |

## Sources

| # | source | URL | what it gave |
| --- | --- | --- | --- |
| 1 | App Store listing (US) | https://apps.apple.com/us/app/peptidepal-peptide-tracker/id6762102880 | subtitle "Peptide Dose Calculator & Log", 4.7K ratings, every price point, version history 1.3.4 to 1.5.9, privacy label |
| 2 | Listing mirror with full description | https://mwm.ai/apps/peptidepal-peptide-tracker/6762102880 | feature list, FAQ, 6 screenshot captions, first release Apr 23, 2026, size 104.5 MB, 18+ |
| 3 | Listing mirror (Canada) | https://apps.appfollow.io/ios/peptidepal-peptide-tracker/6762102880?country=ca | frequency options, curated stack names, AI advisor limits |
| 4 | Onboarding teardown | https://screensdesign.com/showcase/peptidepal-peptide-tracker | 14 onboarding steps in order, hard paywall, monthly and yearly plans |
| 5 | Marketing site | https://peptidepal.health | core loop, offline scope, iOS 18+ and Android, iPad and Watch on the roadmap |
| 6 | Guides | https://peptidepal.health/getting-started, /protocol-planner, /dose-history, /progress-tracker | planned entries kept separate from logged doses, fields on a log entry |
| 7 | Privacy policy (2026-09-11) | https://peptidepal.health/privacy | data model, what lives on device vs server, sign-in methods, vendors |
| 8 | Terms (2026-09-11) | https://peptidepal.health/terms | license limits, see above |
| 9 | George's own account | not used | blocked by the Terms |

Gaps: no help center or public API is linked, and searches surfaced no Reddit threads. YouTube walkthroughs and the Google Play install count were not checked.

## Core loop

Set up a protocol once (compound, dose and unit, frequency, start date, reminder time). Each day a reminder fires, you log the dose in one tap with the injection site, and the calendar, streak and vial supply update. Protocol tracking is what the subscription gates, together with the full library, advanced analytics and AI chat.

## Screens

Inferred from the listing, its screenshot captions (C1 to C6), the teardown (SD), guides (G), privacy policy (P) and version notes (V). No in-app states have been observed directly. Confirm layouts against the public store screenshots, saved to `replica/screens/` as reference only.

| ID | screen | how you get there | purpose | key components | states known | evidence |
| --- | --- | --- | --- | --- | --- | --- |
| S01 | Stats carousel | first launch | social proof before anything else | auto-playing slides of research stats | default | SD |
| S02 | Onboarding quiz | after S01 | personalise and build the profile | one question per screen, single-select options | per question | SD, P |
| S03 | Value props | after quiz | sell the outcome | benefit list | default | SD |
| S04 | Testimonials | after S03 | social proof | review cards | default | SD |
| S05 | Sign in | after S04 | create the account | Sign in with Apple, Sign in with Google | default, cancelled | SD, P |
| S06 | "What's ahead" roadmap | after S05 | set expectations | step list | default | SD |
| S07 | Paywall | end of onboarding | convert | monthly and yearly plans, yearly flagged best deal | default, purchase, restore? | SD, 1 |
| S08 | Today | main tab | the daily protocol hub | dose cards for today, log buttons, streak | empty (no protocols), filled, all done | C1, G |
| S09 | Log dose | tap a dose card | record a dose | time, amount and unit, site, save | default, edit past dose | G, V1.5.0 |
| S10 | Site picker | inside S09 | choose the injection site | body map, heat map of recent sites, suggested next site | default | listing |
| S11 | Calendar | tab | planned vs completed | week strip, month grid with dose dots, day detail | empty, filled | C3, G |
| S12 | Stats and streaks | tab or C3 screen | adherence | streak counter, stats | default | C3 |
| S13 | Protocols | tab or Today | manage active plans | protocol list, add button | empty, several active | listing |
| S14 | Protocol builder | add or edit | define the plan | compound picker, dose, unit (mcg, mg, IU, mL), frequency, specific days, start date, notes, reminders, cycle on/off, pen option | new, edit, from stack | listing, V1.4.7 |
| S15 | Reminders | from S14 or settings | schedule notifications | time pickers, toggles | permission denied | C2, G |
| S16 | Vials | tab or tool | supply on hand | vial cards: fill, concentration, expiry, projected run-out, low badge | empty, low, empty vial | listing, V1.4.1 |
| S17 | Reconstitution calculator | tool (placement changed in v1.5.9) | unit math | vial size, diluent volume, desired amount, syringe size, live syringe diagram, over-capacity warning, save to protocol | default, over capacity | C6, listing |
| S18 | Library | tab | browse compounds and stacks | search, compound rows, stack cards | default | C5 |
| S19 | Compound detail | from S18 | reference | profile sections, regulatory status | default | listing |
| S20 | Stack detail | from S18 | start a pre-built combination | compound list, use stack | default | listing |
| S21 | Health and progress | tab | body metrics | weight, body fat, lean mass, waist, mood, charts, Apple Health or Health Connect import | empty, filled | P, G |
| S22 | Progress photos | from S21 | visual progress | photo grid, compare, time-lapse | empty, filled | listing, P |
| S23 | Estimated levels | from S21 | on-board estimate | curve chart labelled as an estimate | default | listing |
| S24 | AI advisor | tab | educational Q&A | chat, input, stack context | offline, refusal | C4, P |
| S25 | Community | tab | peer Q&A | posts, votes, custom reactions, report, block, pseudonym, avatar | empty, filled | P, V1.4.3, V1.5.9 |
| S26 | Food tracker | tab | meals and macros | food search, meal log, macro totals | empty, filled | V1.5.8 |
| S27 | Settings | profile | account and app | dark mode, notifications, subscription, referral, feedback portal, delete account | default | V, P |
| S28 | Referral | from S27 | invite for a discount | share link, discount status | default | V1.4.2 |

## Flows

```
F01 Onboard and subscribe
    S01 -> S02 (several questions) -> S03 -> S04 -> S05 sign in -> S06 -> S07 paywall -> S08
    happy path: 14 steps (SD)
    edge: paywall dismissed, sign-in cancelled, restore purchase, reinstall on a new phone

F02 Set up the first protocol
    S08 empty -> S13 -> S14 (pick from S18 or custom) -> dose, unit, frequency, start, reminder -> save -> S08
    happy path clicks: to measure
    edge: custom compound, specific weekdays, 5-on/2-off, cycle off-weeks, two protocols on the same day,
          a plan change that must not rewrite past logs

F03 Reminder to logged dose
    push -> S08 -> S09 (one tap) -> S10 site -> saved -> streak and vial supply update
    happy path: the listing claims one tap
    edge: logged late, backdated, edited later (v1.5.0), skipped, double tap, dose not on the schedule,
          time zone travel, daylight saving change

F04 Mix a vial
    S17: vial size, diluent volume, desired amount, syringe size -> mg/mL and syringe units -> save to S14 or S16
    edge: amount over syringe capacity (warning), mcg vs mg mix-ups, IU-based compounds, pens

F05 Running low
    S16 projects run-out from the protocols -> push about 7 days out -> second push when a dose is at risk -> add a vial

F06 Rotate sites
    S10 heat map shows recent sites -> suggested next site -> pick

F07 Start a curated stack
    S18 -> S20 -> use stack -> S14 prefilled -> save

F08 Track progress
    S21 add weight, body composition or mood, or import from Apple Health -> charts
    S22 add a photo -> compare or time-lapse.  S23 estimated level curve

F09 Ask the AI advisor
    S24 question -> 2 to 4 sentence answer that can use your stack -> refuses dose or titration questions
    edge: offline (needs a connection)

F10 Community
    S25 post under a pseudonym -> replies, votes, reactions -> report or block

F11 Delete account and data
    S27 -> delete, two steps

F12 Refer a friend
    S27 -> S28 -> share -> discount applied
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Dose card | scheduled, logged | due, done, overdue, skipped (to confirm) | S08, S11 |
| Week strip | 7-day selector with dose dots | selected day | S08, S11 |
| Month calendar | dose indicators per day | planned, completed | S11 |
| Streak badge | counter | active, broken | S08, S12 |
| Body map | site hotspots, heat overlay | selected, recently used, suggested | S10 |
| Syringe diagram | syringe sizes | live plunger, over capacity | S17 |
| Unit picker | mcg, mg, IU, mL | | S14, S17 |
| Frequency picker | daily, every other day, twice weekly, 5-on/2-off, specific days, custom | | S14 |
| Vial card | single compound, blend | normal, low, empty, expired | S16 |
| Compound row and detail | | | S18, S19 |
| Stack card | | | S18, S20 |
| Line chart | weight, body composition, level estimate | empty, filled | S21, S23 |
| Photo compare and time-lapse | | | S22 |
| Chat bubble and input | user, assistant | sending, offline, refusal | S24 |
| Post card | votes, custom reactions | reported, blocked | S25 |
| Plan selector | monthly, yearly (best deal) | selected, purchasing | S07 |
| Quiz option | single-select | selected | S02 |
| Empty states | no protocols, no vials, no logs, no photos | | S08, S16, S11, S22 |
| Tab bar | tabs not confirmed | | all |
| Dark mode | light, dark | | all |

## Inferred data model

```
User           id, auth_provider (apple | google), email (may be a relay address), created_at
               evidence: privacy policy. Server (Supabase). confidence: high

Profile        user_id, goals, experience, age, biological_sex, height, weight
               evidence: privacy policy (onboarding data). Server. confidence: high

Compound       id, name, nickname, mechanism, half_life, research_status, regulatory_status,
               side_effects, considerations, is_custom
               evidence: listing, library. Bundled with the app. confidence: medium. Content is theirs: write your own

Protocol       id, compound_id or custom_name, dose_amount, dose_unit (mcg | mg | IU | mL),
               frequency (daily | every_other_day | twice_weekly | five_on_two_off | specific_days | custom),
               days_of_week, start_date, end_date, cycle_on_days, cycle_off_days, delivery (syringe | pen),
               reminder_times, notes, status (active | paused | ended)
               evidence: listing, version notes 1.4.7. On device. confidence: high for fields, guess for cycle and pen detail

StackTemplate  id, name, items (compound_id, default settings)
               evidence: curated stacks. Bundled. confidence: medium

Vial           id, compounds (1 or more, for blends), fill_amount, diluent_ml, concentration (derived),
               opened_at, expires_at, remaining (derived from logs), status
               evidence: listing, version notes 1.4.1 and 1.4.6. Storage not stated, guess on device. confidence: medium

DoseLog        id, protocol_id, vial_id, scheduled_for, taken_at, amount, unit, site, status (taken | skipped), notes
               evidence: guides (time, amount with unit, site), listing. On device. confidence: high for fields, guess for skipped

Site           enum of body-map sites, more added in 1.5.9. Exact list unknown. confidence: guess

HealthObservation  user_id, type (weight | body_fat | lean_mass | waist | mood), value, unit, observed_at,
                   source (manual | apple_health | health_connect)
                   evidence: privacy policy. Server. confidence: high

ProgressPhoto  id, user_id, taken_at, storage_path (EXIF stripped)
               evidence: privacy policy. Server storage. confidence: high

ChatMessage    id, role, content, created_at
               evidence: privacy policy (kept on device; sent to the AI through their backend; no server history). confidence: high

CommunityPost  id, pseudonym, avatar, body, created_at, plus Vote, Reaction, Report, Block
               evidence: privacy policy, version notes. Server. confidence: high

Entitlement    user_id, product_id, period, status, expires_at, plus Referral (code, referrer, referee, discount)
               evidence: privacy policy, version notes 1.4.2. Server. confidence: high

FoodEntry      meal, food, macros, logged_at
               evidence: version notes 1.5.8. Storage unknown. confidence: guess
```

Relationships: User 1-n Protocol, Protocol n-1 Compound (or custom), Protocol 1-n DoseLog, DoseLog n-1 Vial, Vial n-n Compound (blends), User 1-n HealthObservation, User 1-n ProgressPhoto, StackTemplate 1-n items.

Storage split: protocols, doses, schedules and chat stay on the device; profile, health metrics, photos, community and subscriptions live on the server. The site advertises optional iCloud sync, but the privacy policy never mentions iCloud. Treat that as unconfirmed.

## Stack and business signals (privacy policy and store page)

- Sign in with Apple or Google. Supabase for the database and file storage. Anthropic behind the AI advisor, with no server-side chat history.
- Superwall paywall, Stripe web checkout, PayPal. TelemetryDeck in the app, PostHog on the website. Meta, AppsFlyer and Appstack for ad attribution.
- iOS 18+ and Android. iPad and Apple Watch on the roadmap. Works offline except for the AI.
- Privacy label: purchases, contact info, identifiers and usage data are used to track you.
- Prices live right now: monthly $9.99, $12.99 or $14.99; quarterly $39.99; yearly $19.99 to $59.99. Several price points at once means they are price testing.

## Changelog signal: what they shipped, in order (v1.3.4 to v1.5.9, May 14 to Sep 28, 2026)

Dark mode, then a feedback portal, then past-schedule navigation, then vial tracking with run-out alerts (Jun 12), referral discounts, wider vial and dose ranges plus Community Q&A (Jun 22), an onboarding rework, blends (Jul 10), pens and advanced scheduling (Jul 15), editing past doses and health metrics (Aug 6), scheduling and calendar fixes, a redesign (Sep 1 to 4), a food tracker (Sep 10), and new dose sites and community reactions (Sep 28). They ship about once a week, and most of that work went into scheduling and supply.

## Feature matrix

See `features.csv`: 56 rows. Must 18, should 18, could 20. Skip 4 (included in the could count). 3 rows are MPP's own (original = no). `clone` is `no` everywhere until the MPP audit fills it in.

## Out of scope

- Their compound profiles, stack recipes and any dosing ranges. That is their content, and dose guidance for unapproved compounds is an App Review risk. MPP writes its own reference text or leaves it out.
- Their community and its members: the network is not a feature.
- Their name, logo, colors, copy, testimonials, the research stats in the onboarding carousel and their user-count claims.

## Risk flags for MPP

1. **App Store guideline 1.4.2** says drug dosage calculators must come from approved entities (a drug maker, hospital, university, insurer or pharmacy) or have FDA-level approval. PeptidePal ships a calculator anyway, framed as unit conversion on numbers the user types, with no dose recommendations. Apple has not said publicly where unit math ends and a "dosage calculator" begins. MPP's calculator should keep the same framing everywhere: the calculator, stacks, AI and library. Sources: [guideline record](https://conductatlas.com/platform/apple/apple-app-store-review-guidelines/provision/CA-P-018798/drug-dosage-calculators-must-come-from-approved-entities/), [unanswered developer thread](https://developer.apple.com/forums/thread/774177).
2. **AI guardrails.** Their advisor refuses dose and titration questions. MPP's AI tab should do the same.
3. **Terms.** No account-based study of PeptidePal (see top).

## Openings spotted (confirm with /replica-entrepreneur before betting on them)

- Subscription only, with live price tests up to $14.99 a month. MPP's $9.99 lifetime Pro is a real contrast.
- Their only self-serve export covers health metrics, not dose history. MPP has a CSV export of logs.
- They run ad-attribution tracking. MPP can claim no tracking if that holds true.

## To confirm (public sources did not show these)

Tab bar layout, the exact site list, what stays free after the hard paywall, skipped and missed dose states, what "advanced protocol scheduling" covers, whether iCloud sync exists, Android feature parity, and empty and error states. Use the public store screenshots and the ScreensDesign recording. Do not use an account.

## Size

Screens 28, flows 12, entities 14.
Hard parts:
1. The scheduling engine: every-other-day, 5-on/2-off, specific days, cycles, pens, plan changes that leave history alone, time zones, daylight saving and reliable local notifications.
2. Vial math: run-out projection when blends and several protocols draw from the same vial.
3. Local-first data with selective server sync, plus account deletion that clears both.

From scratch: L (a quarter). As a gap-fill on MPP's existing app: M (a few weeks) for the missing must-haves. Community, food tracking and Android add to that.

Next: `/replica-architect`, planned against MPP's existing Expo stack.
