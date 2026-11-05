# Later phases (not built in 2.0)

Short plans only. Nothing here ships in 2.0 and none of it is in the code.

## 2.1: Widgets (owner decision: moved out of 2.0)

The 1.7.0 widget failed on device three builds running and was removed
(`docs/RELEASING.md`), so 2.1 starts with a device test before any UI work.

- **Build:** a WidgetKit extension added by a config plugin (for example
  `@bacons/apple-targets`), sharing an App Group with the app.
- **Data:** after every log, plan, vial or skip change the app writes a small
  read-only JSON snapshot to the App Group (next planned entry time, 30-day
  site counts, current streak). No compound names on the lock screen.
- **Widgets:** small (next entry plus an interactive "Log it" button, App
  Intent, iOS 17+); medium (30-day mini heat map); lock screen accessory
  (streak). All free.
- **Risk:** the App Intent has to write the entry without the React Native
  runtime. Plan: the intent appends to a pending-entries file in the App
  Group, and the app imports it on next launch, the same way "Log it" works
  from a notification today.
- **Android:** a Glance home-screen widget reading the same snapshot, after
  the Play launch.

## Live Activities

A Live Activity for "plan entry due in N minutes" on the lock screen and
Dynamic Island, started by the app from the local plan (no push server, so
it can only start while the app runs). Needs the same widget extension, so
it comes after 2.1. Text stays neutral (no compound names).

## Apple Watch

A watchOS companion showing today's planned entries with a "Log it" button,
syncing through WatchConnectivity with the phone as the only store. Needs a
native watch target via a config plugin; evaluate after widgets prove stable.
No Health writes; read-only, like the phone.
