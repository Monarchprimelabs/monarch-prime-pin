# Handoff: build PeptidePal's core loop into Monarch Prime Pin

For a Claude Code cloud session on `Monarchprimelabs/monarch-prime-pin`.

## Context

- **Owner:** George (Monarch Prime Labs). He works from his phone and reviews diffs in the Code tab. Push to a branch and report each step in a few short lines.
- **App:** Monarch Prime Pin (MPP), a live iOS peptide injection tracker. Expo SDK 54, React Native, TypeScript. Freemium: a few free logs, then a one-time lifetime Pro purchase. Read `app.json` and the code for the details. Don't trust this file over the code.
- **Goal:** close the gap between MPP and PeptidePal (Blank Labs), the most downloaded peptide tracker, using the Replica skills. MPP keeps its own brand, copy and content. This improves MPP. It is not a new app.

## Already done

A market check, then `/replica-recon` on PeptidePal, from public sources only:

- `replica/recon.md`: 28 screens, 12 flows, the inferred data model, risks, and what is out of scope.
- `replica/features.csv`: 56 rows, 18 must-haves. `clone` is `no` everywhere until step 1.

## Skills

The Replica pack is enabled on George's claude.ai account, so cloud sessions should load it as `/replica-architect` and so on, or as `/anthropic-skills:replica-architect` if a name clashes.

If the skills don't show up, add the pack to the repo at the reviewed commit:

```bash
git clone https://github.com/Jakeschincariol/replica-skill /tmp/replica-skill
git -C /tmp/replica-skill checkout 77c9436fb3d18c3d58169efb8caf4fe906b0dc51
mkdir -p .claude/skills && cp -r /tmp/replica-skill/replica-* .claude/skills/
```

## Do this, in order

1. **Audit MPP against the matrix.** Read `replica/recon.md`, `replica/features.csv`, then MPP's code. For every row MPP already covers, set `clone` to `yes`, or to `partial` with a note. Check the code for each row rather than assuming. Likely candidates: the body map and site heat map, the reconstitution calculator, the AI tab, CSV export, onboarding and the lifetime paywall. Then run the parity tool from the replica-diff skill on `replica/features.csv`, commit as `recon: MPP coverage`, and report the score and the missing must-haves.
2. **`/replica-architect` against MPP's existing stack.** Keep Expo SDK 54 and MPP's current storage approach. No new stack. Write `replica/architecture.md` with this vertical slice first:
   - A scheduling engine covering daily, every other day, twice weekly, 5-on/2-off, specific days and cycles.
   - Reminders, the Today view, one-tap logging, and editing past doses.
   - After the slice: vials with projected run-out and low-supply alerts.
3. **`/replica-design`, with MPP's brand kept.** Keep MPP's navy, blue and orange and its existing components. Only spec the new ones: the frequency picker, week strip, vial card and syringe diagram. Do not rebuild PeptidePal's look.
4. **`/replica-build` the slice.** One commit per screen. Update `features.csv` as rows get done.
5. **`/replica-test`, adapted for a native app.** Playwright is for web apps. For MPP:
   - Write unit tests (Jest) for the scheduling engine and vial math. Cover daylight saving, time zone travel, late, skipped and backdated doses, plan edits that must not rewrite past logs, and two protocols drawing from one vial.
   - Write a short checklist for George to run on his phone through TestFlight.
6. **`/replica-diff`** for the parity score and the next gaps.
7. **`/replica-entrepreneur`** on PeptidePal's public reviews to pick MPP's angle. Openings worth testing are listed at the end of `recon.md`.
8. **Before release:** run the replica-brand sweep with `--avoid "PeptidePal,Blank Labs,peptidepal.health"` so nothing of theirs leaked. EAS builds need an `EXPO_TOKEN` in the cloud environment's variables and network access to Expo's servers. Without those, George starts the build.

## Rules

- **PeptidePal's Terms** license the app for noncommercial use and prohibit reverse engineering, derivative works and scraping. Use public sources only. Never create an account, read their code or watch their network traffic.
- **Clean room.** Do not copy their copy, library text, stack recipes, icons or screenshots. Store screenshots are layout reference only and never ship.
- **App Store guideline 1.4.2.** The calculator does unit math on numbers the user enters. There are no recommended or default doses anywhere: not in the calculator, stacks, library or AI.
- **AI tab:** educational only. It refuses dose and titration questions.
- **Native modules** (HealthKit, notifications, file system) need a fresh EAS build. Expo Go won't cover them.
- **Branches:** never push to `main`. Work on a branch, and open a PR when George says so.
