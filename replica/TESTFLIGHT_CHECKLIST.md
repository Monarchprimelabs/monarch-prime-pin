# TestFlight checklist: protocols, reminders and vials

For George, on an iPhone, using a TestFlight build of this branch. These features use local notifications, so Expo Go can't test them. You need a real EAS build. Use a Pro account (or the developer bypass). Takes about 20 minutes, plus waiting overnight for reminders.

Tick each box. If something fails, note the step number and take a screenshot.

## 1. Set up a protocol (Tools > Protocols)

- [ ] 1.1 Tools shows **Protocols** and **Vials** with a PRO badge for free users. Tapping either opens the upgrade screen.
- [ ] 1.2 New Protocol: type "Ipa" and the suggestions include Ipamorelin. Pick it.
- [ ] 1.3 The amount field starts **empty**. Nothing is ever filled in for you. Enter 200 and pick mcg. IU and mL are also offered.
- [ ] 1.4 Tap each frequency chip: Daily, Every other day, Twice a week, Days on / off, Specific days, Every N days. The summary line under the chips updates each time.
- [ ] 1.5 Twice a week: you can pick exactly 2 days. A third tap swaps out the older pick.
- [ ] 1.6 Turn on Cycle. Save with empty cycle fields and it is refused with a message.
- [ ] 1.7 Add a second time and remove it again.
- [ ] 1.8 Set a reminder time 3 minutes from now, then Save. iOS asks for notification permission the first time. Allow it.
- [ ] 1.9 If you denied permission: saving says reminders weren't scheduled. Nothing crashes.

## 2. Reminders (lock the phone for these)

- [ ] 2.1 The reminder arrives at the set time with the app closed.
- [ ] 2.2 The lock-screen text says "Protocol reminder" and the time. It does **not** show the compound name.
- [ ] 2.3 Tapping it opens the app straight to the log screen, prefilled with the compound, amount and unit.
- [ ] 2.4 Log that dose, then set another reminder 2 minutes out and Skip it on the Today card. No reminder arrives for the skipped dose.
- [ ] 2.5 Turn reminders off on a protocol. No more reminders arrive for it.
- [ ] 2.6 Overnight: a daily 8:00 AM protocol reminds you at 8:00 the next morning without opening the app.
- [ ] 2.7 Travel test, optional: change Settings > General > Date & Time to another time zone and open the app. Reminders still fire at the same clock time in the new zone.

## 3. Today's plan (Home)

- [ ] 3.1 With no protocols, Home shows "Set Up a Protocol". Free users don't see the card.
- [ ] 3.2 The week strip shows dots: filled green = logged, grey ring = planned or not logged, orange ring = skipped.
- [ ] 3.3 Log on a planned card opens the log screen prefilled. Pick a site and Save. The card turns **Logged**.
- [ ] 3.4 Tapping a Logged card opens that record for editing. Change the site and save. It is still Logged.
- [ ] 3.5 Tap Log on the same dose twice quickly, or log it again from a reminder. It says "Already logged" and makes only one record.
- [ ] 3.6 Skip, then Undo. It goes back to Planned.
- [ ] 3.7 Page back a week with ‹ and pick a day with a planned dose that has no record ("Not logged"). Log it. The record is saved on **that day** (check History).
- [ ] 3.8 Free users: after the 5 free logs, Log on a planned dose goes to the upgrade screen like any other log.

## 4. Editing a plan never changes the past

- [ ] 4.1 Log a few days of a protocol, then Edit it and change the amount. The edit notice says the change applies from today.
- [ ] 4.2 Past days in the week strip and History still show the old amount. Saved records are unchanged.
- [ ] 4.3 End a protocol. It moves to Ended and Today stops showing it after today. History is unchanged.
- [ ] 4.4 Delete a protocol. Its records stay in History. On Home they show as "Also logged".

## 5. History calendar

- [ ] 5.1 Days with a planned dose and no record show a small ring next to the green dot.
- [ ] 5.2 Tapping such a day lists the planned dose with Log and Skip.

## 6. Vials (Tools > Vials)

- [ ] 6.1 Add a Vial: name BPC-157, total 5 mg, liquid 2 mL. The card shows "5 mg in 2 mL · 2.5 mg/mL".
- [ ] 6.2 With an inventory item for it, pick it under "Taken from inventory". Its quantity in Inventory drops by 1, once.
- [ ] 6.3 Edit a protocol and pick this vial under "Draws from". The vial card now shows "Drawn by" and "covers entries through {date}".
- [ ] 6.4 Log a dose from that protocol. The log screen's "Drawn from" shows the vial. "x left of 5 mg" goes down by the dose.
- [ ] 6.5 A dose logged from a vial does **not** pop the old "deduct from inventory?" prompt.
- [ ] 6.6 Two protocols on one vial: the run-out date moves earlier than with one.
- [ ] 6.7 A plan in mL converts through the concentration. A plan in IU on a mg vial shows the "can't convert" note.
- [ ] 6.8 With under a week left, the card shows LOW. Set an expiry date in the past and it shows EXPIRED.
- [ ] 6.9 Vial alerts arrive at 9:00 AM a week before, and the day before, the first planned dose the vial can't cover. The text doesn't name the compound.
- [ ] 6.10 Mark Empty moves the vial to Empty and its alerts stop. Reopen brings it back.

## 7. Units

- [ ] 7.1 The log screen offers mcg, mg, IU and mL on their own row. Nothing is cut off at the right edge.
- [ ] 7.2 Reports: an IU or mL record does not appear in the dose chart. The chart is mass only.

## 8. Backup, restore, delete

- [ ] 8.1 Settings > Backup export, then restore. The confirm dialog lists protocols. Protocols, skips and vials come back, and reminders are rescheduled.
- [ ] 8.2 Restoring a backup made on the App Store version (v1) still works.
- [ ] 8.3 Delete account clears protocols and vials, and no reminders arrive afterwards.

## 9. Welcome, delete, export and calculator

- [ ] 9.1 Fresh install (delete the app first): the first screen says records stay on this phone and asks only for an optional first name. There are no email or password fields.
- [ ] 9.2 Updating over the App Store version: you stay signed in, nothing is asked again, and all records are there.
- [ ] 9.3 Settings has no Sign Out button (the developer bypass still has one).
- [ ] 9.4 Delete All Data asks twice. After it, the welcome screen shows, records are gone, and Pro is still unlocked.
- [ ] 9.5 Tools > Export: open the CSV in Numbers. The first 11 columns are the same as before. New columns: status, protocol, planned_date, planned_time, vial. Skipped planned doses appear as "skipped" rows.
- [ ] 9.6 Calculator: pick 0.3 mL and enter an amount that reads over 30 units. The bar caps at 30 and an orange note says it's more than one full 0.3 mL syringe. "Fit" behaves as before.
- [ ] 9.7 The amount field on the calculator shows "Amount you entered", not an example number.

## 10. Adherence, site history, photos and CI

- [ ] 10.1 Today's plan shows "This week through today: X of Y planned logged" (plus skipped). Paging to a past week says "That week". A week entirely ahead shows no line.
- [ ] 10.2 On the log screen, picking a site shows "Left Abdomen: last logged N days before", "also logged that day" or "no earlier record". Nothing ranks or suggests a site.
- [ ] 10.3 **Photos after update**: install this build over one that already has photos. Every old photo still shows in History > Photos and in record details.
- [ ] 10.4 Add a photo to a new record, force-quit the app and reopen. The photo is still there.
- [ ] 10.5 Settings > Export Backup offers "Export with Photos" and "Export without Photos". With photos, delete all data and restore: photos come back. Without photos, they don't, and nothing crashes.
- [ ] 10.6 The restore confirm dialog lists the photo count.
- [ ] 10.7 GitHub: the CI check on the PR is green.

## 11. Looks

- [ ] 11.1 Every new screen in **light and dark** themes: Protocols, the builder, Vials, the vial form and Today's plan. Text is readable and the switches are visible when off.
- [ ] 11.2 Spanish and Portuguese: no cut-off labels on the frequency chips, week strip or vial card.
- [ ] 11.3 The research banner sits below the status bar on the new modals.
