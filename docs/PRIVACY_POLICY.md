> **DRAFT — requires owner and, if desired, legal review before publication.**
> Intended location once approved:
> `https://monarchprimelabs.github.io/apps/monarch-prime-pin/privacy.html`
> (the URL declared in `store.config.json` and to be entered in App Store
> Connect). Every statement below was checked against the app's source at
> the time of writing; if the app changes how it handles data, update this
> document in the same change.

# Monarch Prime Pin — Privacy Policy

Peptide Tracker & Site Log by Monarch Prime Labs

Last updated: September 2, 2026

**The short version:** Monarch Prime Pin does not collect your data. There
is no cloud account, no server, no analytics, and no advertising. Everything
you log stays on your device unless you choose to share or export it
yourself.

## Information we collect

**None.** Monarch Prime Pin has no analytics, crash reporting, advertising,
or tracking of any kind, and it does not operate a server. We do not receive
your name, email address, device identifiers, location, usage statistics, or
any of the research records you enter. The app makes no network requests of
its own in normal use.

## Where your data lives

Everything you enter is stored locally on your device by the app itself:

- research log entries (compound, amount, date, time, sites, side-effect
  notes, weight, notes, and any attached progress photo);
- schedule entries, inventory items, and record templates;
- the local profile from the sign-in screen (see below);
- your onboarding answers, language, theme, heatmap setting, app-lock
  setting, the date of your last backup, the last values typed into the
  concentration worksheet, and the local record of a Lifetime Pro unlock;
- small local counters the app uses to decide when to show Apple's rating
  prompt (see "Purchases and Apple services" below).

None of this is transmitted to us, because there is no server that could
receive it. If you delete the app, this data is deleted with it, which is
why the app offers a backup feature you control (Tools → Settings & Access →
Data Backup).

## Sign-in screen: a local profile only

The first screen asks for an email address and password (and a name when
signing up). In the shipped app no cloud service is configured, so this
information is **not verified and not sent anywhere**. Only the name and
email address you type are kept on your phone as a local profile so the app
can greet you; the password is never stored and never leaves the device.
"Sign Out" removes that local profile from the device.

## Photos and camera

You can attach a progress photo to a log entry. The app asks for camera or
photo-library permission only at that moment, and only for the action you
chose (take a photo, or pick one). A photo you attach is kept inside the
app's own private storage on your device. Photos are never uploaded, and
they are not included in backup files or CSV exports. You can revoke camera
or photo access at any time in the iOS Settings app; the rest of the app
keeps working.

## Notifications

Reminders are local notifications scheduled on your device. Permission is
requested when you save a schedule entry with the "Local reminder" switch
turned on (it is on by default when creating an entry). A reminder shows a
fixed title ("Research schedule reminder") and the entry title you typed,
at the date and time you chose. The app has no push-notification
capability: it is built without the push entitlement, no device token is
ever created, and we cannot send you messages.

## App lock

If you turn on Privacy & App Lock, the app asks iOS to verify you with
Face ID, Touch ID, or your device passcode before opening, and hides its
content in the app switcher. That check is performed entirely by iOS. The
app stores only a yes/no setting for whether the lock is enabled; it never
sees, stores, or handles biometric data.

## Purchases and Apple services

Lifetime Pro is an optional one-time in-app purchase handled entirely by
Apple through the App Store. Apple processes the payment; we never see or
store your payment information. The app only receives from Apple whether
the purchase exists on your Apple Account, and — to honor customers who
bought the original paid download — the version of the app you first
installed. A local marker records that Pro is unlocked so the app can work
offline; it is deliberately left in place by Sign Out and by Delete Account
& Local Data, because your purchase belongs to your Apple Account, not to
the local profile.

After a few saved entries the app may ask iOS to show Apple's standard
rating prompt, at most once. Whether you respond, and what you say, goes to
Apple under Apple's privacy policy; the app is not told.

## Sharing and export

Data leaves your device only when you explicitly share it, using the
system share sheet or the clipboard:

- **Backup file** — a single JSON file with all records, schedules,
  inventory, and templates. It is plain, readable text and is **not
  password-protected**; keep it somewhere private. Photos, reminders, and
  Pro status are not included.
- **CSV export** — all saved records as a spreadsheet file.
- **Monthly report** — as plain text or as a PDF generated on your device.
- **Progress card** — an image that shows counts and streaks only; it never
  includes compound names.
- **Concentration worksheet summary** — copied to the clipboard.

Each of these is created on your device and goes only where you send it. We
have no access to any of them. If you save a file to iCloud Drive or another
cloud service, that copy is then governed by that service's privacy policy.

## Deleting your data

- **Delete Account & Local Data** (Tools → Settings & Access → Reminders tab,
  bottom) cancels any scheduled reminders and removes the local profile,
  research log entries, schedules, inventory, templates, and onboarding
  status from this device. It does not remove your preferences (language,
  theme, app lock, heatmap setting), the Pro unlock marker described above,
  or the last-backup date, and photo files already attached to entries may
  remain in the app's private storage until the app is uninstalled.
- **Uninstalling the app** removes everything it stored, including photos.
- Backup files, exports, and shared reports that you saved elsewhere are
  yours to delete from wherever you put them.

There is nothing on our side to delete, because nothing was sent to us.

## Children

Monarch Prime Pin is not directed at children under 13, and because the app
collects no information, no personal information from children is ever
gathered. The app is a research recordkeeping tool. As stated in the app's
Legal section:

All peptides, compounds, and substances referenced in this application are
intended SOLELY for research purposes in controlled laboratory settings.

MONARCH PRIME PIN TRACKER is a research data logging tool only. It does not
constitute medical advice, diagnosis, or treatment recommendations.

## Changes to this policy

If this policy changes, the updated version will be posted at this address
with a new "last updated" date. Because the app collects nothing today, any
future change that introduced data collection — for example, an optional
cloud sync — would be announced clearly in the app before it took effect.

## Contact

Questions about this policy or the app:
[monarchprimelabs@gmail.com](mailto:monarchprimelabs@gmail.com)

© 2026 Monarch Prime Labs
