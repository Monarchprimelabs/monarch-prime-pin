# App Store Phase 2: Free Trial + Lifetime Pro

## Product Positioning

**App name:** Monarch Prime Pin

**Subtitle:** Peptide Tracker & Site Log

**Promotional text:**

Private peptide tracking without a forced monthly subscription. Try the tracker free, then unlock Lifetime Pro once for unlimited usage.

**Keywords:**

peptide tracker,injection log,site rotation,protocol log,research tracker,shot tracker,concentration

**Opening description:**

Monarch Prime Pin is a private peptide tracking and site-rotation app built for clear, consistent recordkeeping.

Start free, explore the app, and save two injection records before unlocking. Lifetime Pro unlocks unlimited usage for `$4.99`, including unlimited logging, full history, advanced reports, user-created reminders, inventory, reusable templates, and the concentration worksheet with U-100 marking references.

Optional Lifetime Pro adds advanced reports, user-created schedules and reminders, inventory, reusable templates, and a concentration worksheet.

All amounts, dates, times, schedules, and notes are entered by the user. Monarch Prime Pin does not prescribe, recommend, or suggest dosages or treatment plans.

## Free And Pro Split

### Always Free

- App exploration and onboarding
- Two saved injection records
- View, edit, and delete saved free records
- Site selection and site-rotation heatmap for saved records
- Access details, legal information, and purchase restore

### Lifetime Pro

- Unlimited manual log entries
- Full history, calendar review, and backdated entries
- Advanced reports and shareable summaries
- User-created schedules and local reminders
- Inventory
- Reusable record templates
- Concentration worksheet

## Existing Customer Grandfathering

The approved paid App Store version is `1.0.5` build `9`. The real free-download + IAP launch should use a later build, expected build `12`, and must not treat free `1.1.x` installs as founding paid purchasers.

The app grants Lifetime Pro when either condition is true:

1. Existing local app data is present when the first free-tier-aware build launches.
2. StoreKit reports an `originalAppVersion` of `1.0.5` or earlier.

The first free-tier-aware launch writes a local `@mpp/freemium_seen` marker. This prevents brand-new free users from becoming `legacy-install` users after they create their own free trial data.

The local entitlement is stored separately from account and log data, so signing out or deleting local records does not remove purchased access.

For Android, paid-app ownership requires a separate Play licensing or backend migration before changing the Play Store listing to free.

## Rollout Sequence

1. Keep the approved `1.0.5` paid release protected.
2. Create a non-consumable App Store Connect product:
   - Product ID: `com.monarchprime.pin.pro.lifetime`
   - Reference name: `Monarch Lifetime Pro`
   - Suggested launch price: `$4.99`
3. Build the free-download iOS version with the `ios-production` EAS profile. That profile sets `EXPO_PUBLIC_MONETIZATION_ENABLED=true`.
4. Confirm an existing production purchaser sees `Founding purchaser · Lifetime Pro`.
5. Confirm a fresh install sees `Free plan`, can save two records, and is blocked on the third new record.
6. Confirm the Lifetime Pro purchase unlocks unlimited logging and Pro tools in TestFlight.
7. Change the iOS app price to Free only after the grandfathering and purchase flows are verified.

Previous early-access sequence:

1. Ship version `1.1.0` while the iOS app still costs `$4.99`.
2. Leave `EXPO_PUBLIC_MONETIZATION_ENABLED` unset or `false` in that transition build. Use `android-production` for Android until the matching Google Play product is configured.
3. Confirm an existing production purchaser sees `Founding purchaser · Lifetime Pro`.
4. Confirm a fresh install sees `Early access · Pro preview`.

Do not enable monetization before the product is available. The current early-access mode intentionally keeps every Pro feature open.

## Screenshot Story

1. **Track Every Entry**  
   Show the log form and site selector.
2. **See Your Site Rotation**  
   Show the dashboard heatmap with multiple usage levels.
3. **Find Any Past Record**  
   Show searchable history and calendar.
4. **Stay Consistent**  
   Show the real logging streak and next user-created reminder.
5. **Unlock Advanced Organization**  
   Show reports, schedules, inventory, and concentration worksheet with a small `Lifetime Pro` label.

Avoid screenshots centered on disclaimers. Keep required disclaimers visible in the app, but sell the organizational value in the listing.

## App Review Notes

Monarch Prime Pin is a manual research recordkeeping tool.

- Users manually enter all compounds, amounts, dates, times, and schedule entries.
- The app does not recommend amounts, titration, timing, treatment, or protocol changes.
- Schedule notifications only repeat text, dates, and times entered by the user.
- The concentration worksheet divides a user-entered total mass by a user-entered liquid volume and converts the entered liquid volume into U-100 marking references. It does not calculate target amounts, schedules, protocols, or recommendations.
- Existing customers who originally purchased the paid app receive Lifetime Pro automatically.
- Free users can save two injection records, keep access to those saved records, and unlock Lifetime Pro for `$4.99` unlimited usage.

Provide App Review with a fresh free-tier test account and a separate grandfathered test path if requested.
