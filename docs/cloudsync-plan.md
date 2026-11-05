# Cloud sync plan (Phase 6, plan only)

**Not implemented.** Waiting for the owner to reply "approve Phase 6". The
`cloudSync` Feature exists in `src/lib/featureGate.ts` with nothing behind it.

## Design

- **Store:** the user's own iCloud account, in the app's CloudKit *private*
  database. No Monarch account, no Monarch server, no sign-in.
- **What syncs:** only what the user typed: log entries, plans (protocols),
  dose skips, vials, inventory, templates, symptom notes, lab results, next
  lab date. Photos optional, as CKAssets, behind their own switch.
- **Never synced:** anything from Apple Health (weight, body fat, steps,
  HRV, resting heart rate, glucose, lean mass, waist, sleep), notification
  settings, founder evidence, entitlement caches.
- **Local-first:** AsyncStorage stays the source of truth; the app works
  offline as it does now. A sync engine pushes changed records and pulls
  remote changes with a server change token.
- **Records:** one CKRecord per item, keyed by its existing id, with
  `modifiedAt`. Deletes are tombstones kept for 30 days.
- **Conflicts:** last writer wins per record, by `modifiedAt`.
- **First sync:** writes a full local backup (the existing `backup.ts`
  format) to the device before uploading or merging anything.
- **Expo:** CloudKit has no maintained Expo module, so this needs a small
  native module (Swift) plus the iCloud entitlement through a config plugin.
  Android would need a different store (Drive app data) or no sync.

## Risks

- **Guideline 4.10 (monetizing built-in capabilities):** charging for
  iCloud itself isn't allowed. If sync is Premium, the paywall has to sell the
  sync *feature* (multi-device history, restore on a new phone) rather than
  iCloud storage. Safer option: sync free and Premium unchanged.
- **Guideline 5.1.3(ii) (health data in iCloud):** personal health
  information may not be stored in iCloud. HealthKit-derived data is
  excluded entirely. Log entries and lab values are user-entered health
  information, so App Review may still question them. Mitigations: off by
  default, an explicit opt-in screen saying what syncs, and the reviewer
  note. If Review objects, keep sync to plans, vials and inventory only.
- **Privacy label:** CloudKit private data isn't "collected" by the
  developer, so "Data Not Collected" stays accurate. Confirm before release.
- **Data loss:** last-writer-wins can drop an edit made on two devices
  offline. The pre-sync backup and per-record (not per-collection) merge
  limit the damage.
