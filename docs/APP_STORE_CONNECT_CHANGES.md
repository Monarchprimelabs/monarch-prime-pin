# App Store Connect changes for the personal-log release

The app's own text moved from "for research use only, not for human consumption" to "personal log, not medical advice" (approved by George, 2026-10-10). App Review compares the app with its listing, so change these in App Store Connect **in the same submission**. Have a lawyer read the new Settings > Legal text before release.

## App information
- [ ] **Age rating:** answer the questionnaire so the app is **18+** (medical or treatment information, and drug use references, as applicable). PeptidePal and similar trackers are 18+.
- [ ] **Category:** Health & Fitness (or Medical, if it's there today; keep whichever you have and don't add both).
- [ ] **Privacy policy URL:** it must mention Apple Health. Suggested sentence: "If you turn on Apple Health in Settings, Monarch Prime Pin reads your body weight and body fat percentage to show them next to your records. This data stays on your device, is never sent to us or anyone else, and is never used for advertising."

## Version page
- [ ] **Description and promotional text:** remove "research use only" and "not for human consumption". Describe it as a private, on-device log: protocols and reminders, injection-site history, vials, reports, CSV export, Apple Health weight. Add one line: "Monarch Prime Pin is a personal log. It does not give medical advice or suggest doses."
- [ ] **Keywords:** nothing that promises dosing ("dose calculator", "dosage") — App Store guideline 1.4.2.
- [ ] **Screenshots:** retake any that show the old orange "FOR RESEARCH USE ONLY" banner.
- [ ] **What's New:** mention protocols, reminders, vials, photo safety, Apple Health and the clearer wording.

## App Privacy (nutrition label)
- [ ] Add **Health & Fitness → Health** as data *not collected* (read on device only, never leaves the phone). If the questionnaire asks, it is not linked to the user and not used for tracking.

## Capabilities
- [ ] HealthKit capability on the App ID. EAS adds the entitlement during the build from the `@kingstinct/react-native-healthkit` config plugin in `app.json`; check the build's entitlements afterwards (AUDIT_CHECKLIST §7).

## Review notes
- [ ] Add: "Personal log for adults. All amounts are typed by the user; the app never suggests or defaults a dose, and its worksheet only does unit conversion. Apple Health access is read-only (weight and body fat) and optional, under Settings > Apple Health."
