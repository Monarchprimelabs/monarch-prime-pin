## Parity: 45.1 / 100

features 45.1  (49 counted, must-haves 4 of 18 done)

Not shippable yet: 14 must-have features are not done.

## By area, weakest first
- ai                             0.0  (2 features)
- community                      0.0  (1 features)
- nutrition                      0.0  (1 features)
- progress                      21.4  (5 features)
- account                       25.0  (2 features)
- monetization                  25.0  (3 features)
- protocols                     33.3  (10 features)
- calculator                    35.7  (3 features)
- onboarding                    50.0  (1 features)
- reminders                     50.0  (1 features)
- inventory                     50.0  (4 features)
- library                       50.0  (3 features)
- privacy                       50.0  (1 features)
- logging                       66.7  (3 features)
- calendar                      78.6  (3 features)
- platform                      78.6  (4 features)
- sites                         80.0  (2 features)

## Missing, in build order
- [must] account: Sign in with Apple or Google, no  (Sign-in comes after the onboarding quiz. MPP audit: email/password (Supabase, optional) and guest mode only. src/lib/auth.tsx)
- [must] protocols: Protocol builder from library or custom compound, no  (MPP audit: no protocol entity. Tools > Schedule saves free-text title + date + time entries not linked to a compound or dose)
- [must] account: Account and data deletion in Settings, partial  (Two-step delete; App Review expects it for apps with sign-up. MPP audit: one-step confirm clears device data and reminders then signs out (SettingsScreen confirmDeleteAccount). Does not delete the Supabase account or cloud rows when sync is on)
- [must] calculator: Reconstitution calculator (vial size; diluent; desired amount; syringe size), partial  (Unit math on numbers the user enters. No suggested doses (App Store guideline 1.4.2). MPP audit: Tools > worksheet takes total mass; liquid volume; desired amount -> mg/mL; mcg/mL; U-100 units. No syringe-size input (scale auto-picks 30/50/100). Pro)
- [must] calendar: Week strip + month calendar (planned vs completed; site; time), partial  (MPP audit: month calendar with day detail of logged records (HistoryScreen). No week strip; no planned entries)
- [must] inventory: Vial inventory (fill size; concentration; expiry), partial  (v1.4.1. MPP audit: inventory items with quantity; unit; per-container mass; received and expiry dates; low-stock level. No diluent or concentration)
- [must] logging: One-tap dose log (time; amount + unit; site), partial  (MPP audit: log screen defaults time to Now and Log Again prefills from the last record; still needs compound + dose + site taps; not launched from a reminder)
- [must] logging: Today view of doses due, partial  (Screenshot caption 1. MPP audit: Dashboard shows the next scheduled entry and Log Again; no list of today's due doses)
- [must] protocols: Change the plan without rewriting logged history, partial  (Their guides keep planned entries and logged doses separate. MPP audit: logs are stored apart from schedule entries so edits never touch them; but there is no plan-to-log link to protect yet)
- [must] protocols: Dose units mcg / mg / IU / mL, partial  (MPP audit: mcg and mg only (Injection.unit). No IU or mL)
- [must] protocols: Frequencies: daily / every other day / twice weekly / 5-on-2-off / specific days / custom, partial  (MPP audit: schedule entries repeat once / daily / weekly only (ScheduleRepeat))
- [must] protocols: Several active protocols at once, partial  (MPP audit: many schedule entries can coexist but none carries a compound or dose)
- [must] protocols: Start date + notes + per-protocol reminder times, partial  (MPP audit: schedule entry has date; one time; notes; one local reminder)
- [must] reminders: Dose reminders (push notifications), partial  (MPP audit: local notifications for manual schedule entries (once/daily/weekly). Not generated from a dose plan)
- [should] ai: AI advisor chat (short educational answers), no  (Refuses doses and titration; needs a connection. MPP audit: no AI tab exists in the code)
- [should] calculator: Save a calculation to a protocol or vial, no  (MPP audit: copy summary to clipboard only)
- [should] inventory: Projected run-out date per vial, no  (MPP audit: logs accumulate usedMcg against a container but nothing projects forward)
- [should] library: Compound library (search; profile pages), no  (Structure only. Write MPP's own entries with no dosing ranges. MPP audit: searchable name list only; no profile pages)
- [should] progress: Apple Health import, no  (HealthKit entitlement + fresh EAS build; Health Connect on Android)
- [should] protocols: Cycles with on/off boundaries, no
- [should] protocols: Pen dosing, no  (v1.4.7)
- [should] calculator: Syringe diagram with live plunger + over-capacity warning, partial  (MPP audit: horizontal unit gauge (deliberately not a syringe drawing) with over-100-unit warning)
- [should] inventory: Low-supply alert about 7 days out + empty alert, partial  (MPP audit: Low stock badge at a user threshold in the inventory list; no push)
- [should] monetization: Paywall at end of onboarding, partial  (Hard paywall, monthly + yearly. MPP decision: lifetime vs subscription. MPP audit: soft paywall after 5 free logs (FREE_INJECTION_LIMIT), not at end of onboarding. Lifetime, not subscription)
- [should] onboarding: Onboarding quiz (goals; experience; age; sex; height; weight), partial  (One question per screen; feeds the profile. MPP audit: 2-step quiz (goal; what to track). No profile fields, by design)
- [should] progress: Weight and body-composition tracking with charts, partial  (Body fat; lean mass; waist. MPP audit: optional weight per log and a weight trend in Reports; no body fat; lean mass or waist)
- [should] sites: Recent-site heat map + rotation suggestion, partial  (MPP audit: decaying site heat map with bands and history scrub (heatMath.js); no suggested next site)
- [could] ai: AI answers use the user's own stack, no
- [could] community: Community Q&A (pseudonym; votes; reactions; report; block), no  (Report + block from day one)
- [could] library: Curated stacks that prefill a protocol, no  (No default doses (App Review risk))
- [could] monetization: Friend referral discounts, no  (v1.4.2)
- [could] monetization: Subscription price testing, no  (Live price points: monthly $9.99-$14.99, quarterly $39.99, yearly $19.99-$59.99. MPP audit: single $9.99 lifetime price)
- [could] nutrition: Food tracker (meals; macros; food library), no  (v1.5.8; off the core loop)
- [could] platform: In-app feedback portal, no  (v1.3.9)
- [could] progress: Estimated on-board level curve, no  (Label it as an estimate from half-life)
- [could] progress: Mood tracking, no  (MPP audit: side-effect severity and symptom tags per log, but no mood)
- [could] protocols: Advanced protocol scheduling, no  (v1.4.7; details not public)
- [could] platform: Android app, partial  (MPP's repo has an Android config and EAS profile; confirm whether it ships on Play. MPP audit: Android config and EAS profile exist; Play release not confirmed)
- [could] privacy: Export health observations, partial  (Their only self-serve export. MPP audit: weight is a column in the dose CSV; also full JSON backup/restore)
- [could] progress: Progress photos (compare; time-lapse), partial  (They strip EXIF before upload. MPP audit: photo per log; History Photos tab; compare two. No time-lapse)
- [could] protocols: Blends tracked across protocols and vials, partial  (v1.4.6. MPP audit: 11 blends in the compound picker as single names; inventory is not blend-aware)

## Left out on purpose (not scored)
- Their compound profiles and stack recipes: Their content; write your own or leave it out
- Their community and its members: Their network; cannot be cloned
- PeptidePal name; logo; colors; copy: Never cloned
- Their testimonials and user-count or research-stat claims: Their marketing; no fake proof

## Yours, not in the original (not scored)
- Export full dose history to CSV
- Lifetime Pro purchase
- No ad tracking
