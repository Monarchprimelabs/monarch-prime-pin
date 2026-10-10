# Architecture: Monarch Prime Pin, closing the PeptidePal core-loop gap

Planned against MPP as it is today (v1.7.0, read from the code on 2026-10-10). No new stack. This adds a scheduling engine and vials to the existing app. It is not a rewrite.

Starting point: parity 45.1 / 100, 4 of 18 must-haves done (`replica/parity.md`). 10 of the 14 missing must-haves are covered by the slice below.

## Stack (unchanged)

| layer | choice | why |
| --- | --- | --- |
| app | Expo SDK 54, React Native 0.81, TypeScript | what ships today |
| navigation | MPP's own tab state in `BottomTabs.tsx` + modals | keep it; new screens open as modals like the Tools do |
| storage | AsyncStorage JSON lists via `src/lib/storage.ts` | every collection except injections is already local-only. `SUPABASE_URL` is still the placeholder, so in the shipped app injections are local too |
| cloud | Supabase stays dormant and untouched | AGENT_RULES: no sync expansion without approval. New data is local-only |
| reminders | `expo-notifications`, local only (`with-local-notifications-only` plugin) | already in the build. No push server |
| payments | `react-native-iap`, $9.99 lifetime | unchanged |
| tests | Jest via `jest-expo` (new devDependency) on pure TS modules | engine and vial math have no RN imports, so they test in Node. `scripts/test-heat.js` keeps working |

New native modules: none. The slice ships in a normal EAS build. (HealthKit, later, will need a fresh one.)

## Data model

Access rules: local device only, one user per install, so no row-level rules. Every read goes through `storage.ts`. Corrupt JSON falls back to empty, as today.

Times: a dose plan is in **local wall-clock time** (`YYYY-MM-DD` + `HH:MM`), the same as `Injection.date/time` today. "8:00 AM" stays 8:00 AM after a daylight-saving change or a flight. Logs also store the UTC instant and offset so history can be shown unambiguously.

```ts
// src/lib/schedule/types.ts  (new)
type DoseUnit = 'mcg' | 'mg' | 'IU' | 'mL';           // widens Injection.unit

type Frequency =
  | { kind: 'daily' }
  | { kind: 'interval'; everyDays: number }             // 2 = every other day; N = custom
  | { kind: 'weekdays'; days: Weekday[] }               // twice weekly, specific days
  | { kind: 'onOff'; onDays: number; offDays: number }; // 5-on/2-off

type Cycle = { onDays: number; offDays: number };        // e.g. 8 weeks on, 4 off, applied on top of Frequency

type ProtocolRevision = {            // a plan edit adds a revision; old ones are never changed
  effectiveFrom: string;             // YYYY-MM-DD, local
  amount: string; unit: DoseUnit;    // typed by the user. No defaults anywhere (guideline 1.4.2)
  frequency: Frequency;
  cycle?: Cycle;
  times: string[];                   // HH:MM, 1+ per day
  reminders: boolean;
};

type Protocol = {
  id: string;
  compound: string;                  // picker name or custom, same strings as Injection.peptide
  startDate: string;                 // anchor for interval / onOff / cycle
  endDate?: string;
  vialId?: string;                   // which vial it draws from
  notes?: string;
  status: 'active' | 'paused' | 'ended';
  revisions: ProtocolRevision[];     // sorted by effectiveFrom
  createdAt: string; updatedAt: string;
};

// Injection (existing) gains optional fields only. Old records stay valid.
type Injection = { /* existing */ unit: DoseUnit;
  protocolId?: string;
  occurrenceKey?: string;            // `${protocolId}|${date}|${HH:MM}` of the planned dose it fulfils
  vialId?: string;
  takenAtUtc?: string; tzOffsetMin?: number;
};

type DoseSkip = { occurrenceKey: string; skippedAt: string };   // kept apart so skips never count as logs, free-log slots or CSV rows

type Vial = {
  id: string;
  label: string;                     // compound or blend name
  massMcg?: number; units?: number;  // mass, or IU for IU compounds
  diluentMl: number;                 // concentration = mass / diluentMl, derived, never stored
  openedAt: string; expiresAt?: string;
  inventoryItemId?: string;          // opened from this stock item
  status: 'active' | 'empty' | 'discarded';
};
```

New AsyncStorage keys: `@mpp/protocols`, `@mpp/dose_skips`, `@mpp/vials`, `@mpp/reminder_map`. Existing keys and the existing Schedule tool are left alone (AGENT_RULES: no renames). Both `clearLocalData()` and backup must include the new keys: backup goes to `backupVersion: 2` and restore still accepts v1.

If George later turns on Supabase sync, the four new fields on `Injection` need matching nullable columns before the first insert. Otherwise a cloud insert fails and falls back to local. No SQL is written now because sync is out of scope.

## Module API (the app has no server, so these are the "routes")

| module function | does | input | output | flow |
| --- | --- | --- | --- | --- |
| `schedule/engine.occurrencesBetween` | expands protocols into planned doses | protocols, from, to (local dates) | `Occurrence[]` {key, protocolId, date, time, amount, unit} | F02, F03 |
| `schedule/engine.revisionOn` | picks the revision in force on a date | protocol, date | revision | F02 edit |
| `schedule/status.dayStatus` | joins occurrences with logs and skips | date, occurrences, injections, skips | due / done / late / skipped / missed per occurrence | S08, S11 |
| `storage.get/save/update/endProtocol` | CRUD. An edit writes a new revision effective today | Protocol | Protocol | F02 |
| `storage.saveSkip / removeSkip` | skip or un-skip one planned dose | occurrenceKey | | F03 |
| `storage.saveInjection` (existing) | gains protocolId, occurrenceKey, vialId, UTC stamp | Injection | Injection | F03 |
| `reminders.sync` | cancels and reschedules every protocol reminder for the next 14 days (rolling window) | protocols, skips, logs | count scheduled | F03 |
| `vials/math.remaining` | mass minus every log drawn from the vial | vial, injections | mcg or IU left | F05 |
| `vials/math.projectRunOut` | walks future occurrences of every protocol on the vial in time order | vial, protocols, injections | run-out date, first at-risk dose | F05 |
| `vials/alerts.sync` | local notifications 7 days before run-out and on the at-risk dose | vials, projections | | F05 |

Background work: none on a server. `reminders.sync` and `vials/alerts.sync` run on app start, on return to foreground, and after any protocol, vial, log or skip change.

## The parts that bite

- **iOS caps pending local notifications at 64.** Schedule DATE triggers for a rolling 14-day window, capped at about 50, nearest first. Add one last notice, "open MPP to keep reminders coming", at the end of the window. Repeating triggers can't express 5-on/2-off or cycles, so use DATE triggers for everything.
- **Daylight saving.** Occurrences are wall-clock. A 2:30 AM dose on spring-forward day doesn't exist: fire at 3:00 and keep the occurrence key. Fall-back fires once. Tests cover both.
- **Time zone travel.** Wall-clock means "8 AM wherever I am". `reminders.sync` on foreground re-anchors to the new zone. Logs keep `tzOffsetMin` so a dose logged in Tokyo still shows on the right day back home.
- **Plan edits must not rewrite history.** Revisions are append-only. Past days are judged by the revision in force then. Logs keep their own amount and unit, so nothing past is recomputed.
- **Anchors.** Interval, on/off and cycle counts run from `startDate`, not from "today" or the last log. A late dose does not shift the plan. Pausing ends the protocol and resuming creates a new one, so anchors stay simple.
- **Double taps.** Saving a log checks for an existing log with the same `occurrenceKey`. One-tap is idempotent.
- **Late, skipped, backdated.** Logging on a past day attaches to that day's occurrence if one exists. Otherwise it's an unplanned log, which is allowed. Skips are reversible.
- **Units.** IU and mL don't convert to mass. Vial math runs only when the dose unit matches the vial (mass, IU) or converts through the vial's concentration (mL). Analytics and the inventory deduction treat IU and mL as non-mass rather than as mcg.
- **Two protocols, one vial.** The projection merges both occurrence streams in time order. Blends are tracked as one vial of the blend's total mass, as the user enters it.
- **Free tier.** One-tap logs count toward the 5 free logs exactly like the log screen. A skip is not a log.
- **Guideline 1.4.2.** Amount fields start empty. No library, stack or preset fills a dose. The "twice weekly" preset fills days, never amounts.
- **Deletion.** `clearLocalData()` plus `cancelAllLocalReminders()` already run on delete. Add the new keys to the first and the reminder map to the second.

## Build order

**1. Vertical slice: plan, reminder, Today, one tap, edit.** One commit per screen.

| step | screens | modules | features.csv rows closed |
| --- | --- | --- | --- |
| 1a | none | `schedule/types`, `engine`, `status` + Jest suite | engine underneath all of the below |
| 1b | S13 Protocols list, S14 Protocol builder (in Tools; frequency picker, unit picker, times, cycle, start date, notes) | `storage` protocols + revisions | builder, units, frequencies, several protocols, start/notes/reminder times, cycles, change plan without rewriting history |
| 1c | none (reminder settings live in S14) | `reminders.sync`, foreground hook in `AppRoot` | dose reminders |
| 1d | S08 Today, at the top of Dashboard: today's dose cards (due / done / late / skipped) | `status` | Today view |
| 1e | S09 quick-log sheet: compound, amount and time prefilled, site picked on the body map, one Save. Tapping a reminder opens it | `saveInjection` + occurrence link, idempotency | one-tap log |
| 1f | S11 week strip above the History calendar; planned vs done dots; "log late" and "skip" on a past occurrence; edit keeps the link | `status` | week strip + calendar, edit/backdate (already yes, keep it working) |

The slice takes must-haves from 4 to 14 of 18. Still open after it: vial inventory with concentration (milestone 2), the calculator's syringe-size input, two-step account deletion, and Apple/Google sign-in (milestone 3).

**2. Vials.** S16 vial list and vial card (fill, concentration, opened, expiry, remaining, run-out, low and empty states). "Open a vial" from an inventory item takes 1 off its quantity. Protocols pick a vial. `vials/math`, `vials/alerts`. Closes: vial inventory (must), projected run-out, low-supply and empty alerts. The calculator's "save to vial" (should) comes nearly free here. Must-haves reach 15 of 18.

**3. Remaining must-haves.**
- Syringe-size input (0.3 / 0.5 / 1 mL) on the calculator. Small.
- Two-step account deletion. Small.
- Sign in with Apple. Only matters if MPP keeps accounts. Today the account is a local profile, and Guest works. Apple only requires Sign in with Apple when other third-party sign-in is offered, which MPP doesn't do. George's call.

**4. Should-haves.** Apple Health import (fresh EAS build), body-composition fields, the AI tab (educational only, refuses dose and titration questions; needs a backend, so it's a stack decision), and an original compound reference with no dose ranges. Pen dosing is a vial variant.

**5. Fixes from `/replica-entrepreneur`**, once it has run.

## Status (2026-10-10)

Built on this branch: milestone 1 (the slice) and milestone 2 (vials). Parity is 67.6, up from 45.1, with must-haves at 15 of 18. `npm test` runs 42 engine and vial tests under three time zones. Device checks are in `replica/TESTFLIGHT_CHECKLIST.md`. Still open: milestone 3 (syringe size, two-step delete, Apple sign-in) and everything after it.

## Decisions (George, 2026-10-10)

1. **Gating:** protocols, Today and vials stay Pro, matching Schedule and Inventory today. The 5-free-logs limit is unchanged.
2. **Old Schedule tool:** left as it is, with Protocols added beside it.
3. **Jest:** approved as a dev-only dependency.

## Compliance changes found while building

`docs/AUDIT_CHECKLIST.md` §4 bans advising copy ("due", "overdue", "rest this area") and says rotation numbers only ever come from the user. So:
- statuses read Planned / Logged / Skipped / Not logged
- `sites.suggestNext` is dropped. The quick log shows the existing heat map and the user picks the site. The "rotation suggestion" half of that row stays open on purpose.
- reminder notifications never name the compound
