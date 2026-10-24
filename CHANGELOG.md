# Changelog

## 2.0 (unreleased)

What's New text for App Store Connect (owner pastes it; widgets moved to 2.1,
so they are not listed):

```text
Version 2.0
- Founding Members: everyone who downloaded before this update keeps everything they had, with no new limits, plus a Founding Member badge.
- Bought Lifetime Pro? You keep everything and get Premium free for life.
- Logging is now unlimited for everyone, free.
- Two active plans with reminders are free, with one-tap "Log it" and "Snooze 1 h" right from the notification.
- New optional reminders: unlogged-plan follow-up, low-vial alerts, restock dates, photo check-ins and a Sunday summary. Each has its own switch in Settings, with quiet hours.
- New Premium (optional): lab results log with charts and lab reminders, summaries of your own entries, expanded Apple Health trends (HRV, resting heart rate, sleep, glucose), full heat map history, per-compound charts, photo compare and monthly PDF reports.
- The annual plan includes a 1-week free trial for new subscribers. Monthly and one-time Lifetime options are also available.
- Worksheet clarified: a math helper for numbers you enter. It does not recommend amounts.
- Designed for iPad and iPhone Duo.
- Full Spanish and Portuguese support for all new screens.
```

Engineering notes:

- Purchases move to `expo-iap` (StoreKit 2 / Play Billing): Premium monthly,
  annual (1-week trial) and lifetime; the 1.x Lifetime Pro stays honored.
- Founder detection before any 2.0 write; Keychain copy.
- Feature gates in one place (`featureGate.ts`), all visible with a lock.
- New paywall with placements and caps; review prompts at positive moments.
- Labs, Insights, Health trends (Premium); notifications with per-type
  switches, quiet hours and a daily cap; lapsed-Premium handling;
  on-device activity counters.
- Expo SDK 58, React Native 0.88; iPad and iPhone Duo layouts.
