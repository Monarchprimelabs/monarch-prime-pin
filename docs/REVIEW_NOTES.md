# App Review notes: Monarch Prime Pin 2.0

The owner pastes the text block into App Store Connect > App Review
Information > Notes. It is adapted from the handoff draft to match what 2.0
actually ships: no widgets (moved to 2.1), no extra themes, no heat-map
replay, no promotional notifications.

**Before pasting:** confirm the prices against App Store Connect. They are
shown in the app only from the store (`displayPrice`), never hardcoded.
Delete the founder-code sentence if no FOUNDER offer code is created.

```text
App Review notes, Monarch Prime Pin 2.0

What changed
1. New optional Premium subscription (group "Monarch Prime Pin Premium"): monthly, annual with a 1-week free trial for new subscribers, and a one-time Lifetime Premium. Premium adds: a lab results log with charts, saved lab reports (photos or PDF) and lab reminders, on-device summaries of the user's own entries ("Insights"), expanded read-only Apple Health trends (HRV, resting heart rate, sleep, blood glucose, lean body mass, waist), the full-history site heat map (90 days and All), weekly and per-compound history charts, unlimited active plans (2 are free), progress photo compare, and monthly PDF reports.
2. The free tier is more generous: logging is now unlimited for everyone (the previous 5-entry limit is removed). The concentration worksheet, 2 active plans with reminders, vials, calendar, photos, CSV export and backup are free.
3. Customers who bought the earlier one-time Lifetime Pro unlock (com.monarchprime.pin.pro.lifetime) keep everything and get Premium at no cost, identified by that existing non-consumable purchase through StoreKit 2.
4. Existing free users ("Founding Members") keep every feature they had in 1.x with no new limits and get a badge. They are identified on device by existing 1.x app data, or by AppTransaction.originalPurchaseDate before the 2.0 release date in the production environment only. A fresh install in the review environment shows the standard new-user experience and paywall.
5. Optional local notifications: the plan reminders the user sets (with "Log it" and "Snooze 1 h"), a follow-up for an unlogged plan entry, low-vial and restock-date alerts, a Sunday summary, a monthly report note (Premium), photo check-ins, and an opt-in trial-ending reminder. Every type has its own switch in Settings > Notifications, with quiet hours and at most 2 non-plan notifications a day. There are no promotional notifications. Notification permission is requested only when the user turns on a plan reminder or the trial reminder.

How to review
- No account or login. All data is stored on device.
- Paywall: Tools > Labs (lock icon), any locked chart in Reports, the 90d / All heat-map ranges on Home, or Tools > Settings > Access > See Premium. Restore Purchases, Redeem Code, Terms of Use and Privacy Policy are on the paywall, and the close button is always visible.
- Lab results: Tools > Labs. Users enter their own values and the reference range printed on their own lab report. The app shows charts only; the one statement it makes is "Outside the reference range you entered". It does not interpret results. Users can also save their own report as photos or a PDF (Labs > Add Lab Report). The file stays on the device; the app shows it as is and never reads values out of it.
- Insights are deterministic summaries of the user's own entries (counts, site usage, plan adherence). They contain no recommendations.

Concentration worksheet (Guideline 1.4.2)
- Tools > Worksheet is a unit-conversion helper for numbers the user types in (amount in the container, liquid volume, amount entered, syringe scale). It does not contain or suggest amounts for any substance, has no compound presets, starts with empty fields, and can show the arithmetic used ("Show math").
- A permanent notice states it does not recommend amounts and that measurements should be confirmed with a licensed pharmacist or clinician.
- It is free for all users and is not part of Premium or marketing materials.
- If App Review determines this feature still falls under 1.4.2, please tell us and we will remove it in an update; that build is ready.

Health information (Guideline 1.4.1)
- The app does not provide medical advice and reminds users to consult a clinician before making medical decisions. Apple Health data is read only, shown only on the device, and never written to iCloud, backups or any server.

Hidden features (Guideline 2.5.19)
- The app contains no hidden, dormant, or remotely enabled features. There is no remote configuration and no analytics. All features are visible in the UI; Premium features show a lock badge.
```
