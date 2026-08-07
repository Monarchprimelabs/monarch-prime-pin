# Audit Checklist — Monarch Prime Pin

Run EVERY category on EVERY "audit everything" pass. This list exists because
bugs escaped audits that only checked what was enumerable. **Rule: every bug
that ships adds its pattern to this file in the same PR that fixes it.**

## 1. Mechanical (scriptable — run all of these)

- [ ] `npx tsc --noEmit` clean
- [ ] `node scripts/test-heat.js` — all assertions pass
- [ ] i18n parity: EN and ES dictionaries have IDENTICAL key sets
- [ ] Dynamic i18n families complete: every zone id has `zone.*` + `zoneShort.*`,
      every symptom tag has `symptom.*`, all severities/periods/heat bands covered
- [ ] No conflict markers (`<<<<<<<`), no `console.log` in src/
- [ ] No secrets: grep for key/token/password patterns; no env/cert files tracked
- [ ] `package-lock.json` in sync with `package.json` (npm ci must work cold)

## 2. Known React Native footguns (grep-sweep — bugs that shipped are marked ⚠️)

- [ ] ⚠️ **`toISOString()` / `new Date('YYYY-MM-DD')` for calendar days** — UTC
      shifts the day for evening use. All calendar-day reads/writes go through
      `src/lib/dates.ts` (`localDateISO` / `parseLocalDay`). Grep both patterns
      on every pass; the only allowed hits are absolute instants (exportedAt).
- [ ] ⚠️ **SafeAreaView inside `<Modal>`** — insets read as ZERO inside a plain
      RN Modal. Every Modal hosting inset-dependent content must wrap its
      children in its own `<SafeAreaProvider>`. Grep `<Modal` and verify.
- [ ] **`JSON.parse` on stored data without try/catch** — one corrupt value must
      not brick a screen. Storage reads go through `safeParse` (storage.ts).
- [ ] **StyleSheet values captured at import time** — anything reading `colors.*`
      in a module-level StyleSheet gets the LAUNCH-TIME colorway. Runtime color
      changes require the AppRoot lazy-require gate (App.tsx). Never import
      screen modules before `loadColorway()` resolves.
- [ ] **String sorting of dates/times** — only valid because times are
      zero-padded (`resolveRecordTime` pads). If any new time source appears,
      verify padding before it reaches a `localeCompare` sort.
- [ ] **Stored-label resolution** — record sites are English display strings;
      every rename must ADD to `legacyAliases` in sites.ts, never remove.

## 3. Copy-truthfulness (read every label that makes a claim about data — ⚠️ two shipped)

For each user-facing string that characterizes computed data, verify the claim
matches the computation:

- [ ] ⚠️ Weight trend: "no change" only for a truly flat series; if the series
      moved but returned, show the range (`reports.weightRanged`).
- [ ] ⚠️ "This Week" tile: computation is a ROLLING 7 days → label must say
      "Last 7 Days", not "This Week".
- [ ] Streak: not having logged YET today must not zero an active streak
      (grace until the day actually ends).
- [ ] "Site selections" (Reports): sums selections, not distinct sites — label
      says "selections". If a distinct-sites stat is ever added, count keys.
- [ ] Sweep: grep i18n for since/week/month/total/average/change/streak and
      re-verify each against its computation.

## 4. Compliance (every new user-facing string)

- [ ] Describes, never advises: no recommend/should/safe/ready/due/overdue/
      overused/rest-this-area; no medical vocabulary
- [ ] Rest/rotation numbers only ever come from the user
- [ ] Colors = logged frequency only; legend says so
- [ ] Worksheet "locates an entered amount on a scale" — never "calculates dose"
- [ ] No compound names on anything that leaves the app by default
      (widget, share card)

## 5. Render-level (cannot be verified from code — needs device/screenshot QA)

These escape every static audit. Explicitly hand them to George's QA pass:

- [ ] Banner sits below the status bar on every screen INCLUDING all modals
- [ ] Sheet buttons clear the home indicator
- [ ] All three colorways after a true force-quit relaunch
- [ ] Spanish: no truncated/overflowing labels (longer strings than EN)
- [ ] New zones/dots sit on the drawn mannequin geometry
- [ ] Notifications fire with the app closed (real build only, not Expo Go)

## 6. Data-shape regression (on any stored-type change)

- [ ] Old records (missing new optional fields) still render and edit
- [ ] Backup from a previous version imports cleanly
- [ ] New fields survive the backup/restore round trip
