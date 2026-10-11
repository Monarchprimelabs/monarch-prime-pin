# New components for MPP's scheduling slice and vials

MPP's look stays as it is. The source of truth is `src/theme/index.ts` (navy, blue and orange brand, dark and light palettes) and `src/components/UI.tsx` (`Card`, `CardLabel`, `Header`, `ViewPill`, `Disclaimer`). Nothing of PeptidePal's look is used. The specs below cover only the components that are new, and they reuse MPP tokens by name.

Contrast: `tokens.dark.json` and `tokens.light.json` mirror the theme roles these components use. `contrast.py` passes both with 0 AA failures under three rules:
- Orange **text** uses `colors.accentLight`, not `colors.accent`. `accent` on a white card is 3.18:1.
- Filled buttons in new components use `colors.primaryDark` behind `colors.actionText` (5.75:1). The existing `primary` fill is 3.68:1 in dark mode and is left alone where it already ships.
- Muted text sits on cards, never on the bare light background.

Copy follows `docs/AUDIT_CHECKLIST.md` §4. It describes and never advises. No "due", "overdue", "recommended" or "should". Statuses are **Planned**, **Logged**, **Skipped** and **Not logged**. Amount fields start empty. Notifications never show a compound name.

## Frequency picker (S14)

```
variants  chips: Daily · Every other day · Twice a week · 5 on / 2 off · Specific days · Every N days
detail    Twice a week / Specific days -> 7 weekday toggles (locale order from Intl, Sun..Sat stored as 0..6)
          Every N days -> numeric field (2..60)
          5 on / 2 off -> two numeric fields, prefilled 5 and 2 (counts, not doses)
cycle     optional toggle "Cycle" -> on days + off days fields
states    selected chip (primary border + tinted fill), invalid (no weekday picked -> red helper text)
tokens    chip bg colors.bgPill, border colors.border, selected border colors.primary, fill withAlpha(primary, .15)
          radius.pill, font 13/600
a11y      each chip accessibilityRole="radio", accessibilityState.selected; weekday toggles role="checkbox"
summary   one live line under the picker, e.g. "Mon and Thu at 8:00 AM, starting Oct 12"
```

## Week strip (S08, S11)

```
layout    7 equal columns, Mon..Sun of the selected week (locale first day), ‹ › to page weeks
cell      weekday initial (11/600 textMuted), day number (15/700 text), dot row below
dots      one dot per planned dose: filled colors.teal = Logged, ring colors.textFaint = Planned / Not logged,
          ring colors.accentLight = Skipped; unplanned logs add a small filled colors.primary dot
states    today (primary outline), selected (primaryDark fill + actionText number), no plan (no dots)
a11y      each cell a button labelled "Thursday Oct 12, 2 planned, 1 logged"
```

## Planned-dose card (S08 Today, S11 day detail)

```
content   compound (16/700 text), amount + unit and time (13 textMuted), status pill on the right
statuses  Planned (bgPill, textMuted), Logged (teal tint, teal text, shows logged time),
          Skipped (accentLight text), Not logged (past occurrence: textFaint)
actions   Planned / Not logged -> [Log] primaryDark button + [Skip] text button
          Logged -> tap opens the record (edit); Skipped -> [Undo]
empty     Today with no protocols: "No plan for today" + "Set up a protocol" link to S13 (Pro gate applies)
tokens    Card padding 14, radius.md, hairline top border as Card does
a11y      card is a group; buttons labelled "Log Ipamorelin 8:00 AM"
```

## Vial card (S16, milestone 2)

```
content   label (16/700), "x mg in y mL · z mcg/mL" (13 textMuted), remaining bar, run-out line, expiry line
bar       track colors.bgPill, fill colors.primary; under 7 days left -> fill colors.accentLight; empty -> colors.red
states    normal, low (accentLight "About n days left at your plan"), empty, expired (red "Expired on ..."), no plan linked
tokens    Card, bar height 6, radius.pill
```

## Syringe diagram (calculator, milestone 3)

MPP's calculator deliberately draws a horizontal unit gauge, not a syringe ("deliberately NOT a syringe illustration", ToolsScreen). Keep that. The milestone adds only a syringe-size selector (0.3 / 0.5 / 1 mL) that fixes the gauge's scale at 30 / 50 / 100 units, plus the existing over-capacity colouring. No new illustration.
