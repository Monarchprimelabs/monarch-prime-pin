# App Store Phase 2: Free Core + Lifetime Pro

## Product Positioning

**App name:** Monarch Prime Pin

**Subtitle:** Peptide Tracker & Site Log

**Promotional text:**

Private peptide tracking without a forced monthly subscription. Build a complete history, review site rotation, and organize your own research schedule.

**Keywords:**

peptide tracker,injection log,site rotation,protocol log,research tracker,shot tracker,concentration

**Opening description:**

Monarch Prime Pin is a private peptide tracking and site-rotation app built for clear, consistent recordkeeping.

Start free with unlimited manual tracking, complete history, calendar review, and an interactive site-rotation heatmap. Your core records stay available without a subscription.

Optional Lifetime Pro adds advanced reports, user-created schedules and reminders, inventory, reusable templates, and a concentration worksheet.

All amounts, dates, times, schedules, and notes are entered by the user. Monarch Prime Pin does not prescribe, recommend, or suggest dosages or treatment plans.

## Free And Pro Split

### Always Free

- Unlimited manual log entries
- Complete history and search
- Calendar review and backdated entries
- Site selection and site-rotation heatmap
- Basic activity overview and current logging streak

### Lifetime Pro

- Advanced reports and shareable summaries
- User-created schedules and local reminders
- Inventory
- Reusable record templates
- Concentration worksheet

## Existing Customer Grandfathering

The first public paid version was `1.0.4`. Version `1.1.0` is the paid-to-free transition build.

The app grants Lifetime Pro when either condition is true:

1. Existing local app data is present when the first free-tier-aware build launches.
2. StoreKit reports an `originalAppVersion` of `1.1.0` or earlier.

The local entitlement is stored separately from account and log data, so signing out or deleting local records does not remove purchased access.

For Android, paid-app ownership requires a separate Play licensing or backend migration before changing the Play Store listing to free.

## Rollout Sequence

1. Ship version `1.1.0` while the iOS app still costs `$4.99`. Its cutoff includes buyers during the transition.
2. Leave `EXPO_PUBLIC_MONETIZATION_ENABLED` unset or `false`.
3. Confirm an existing production purchaser sees `Founding purchaser · Lifetime Pro`.
4. Confirm a fresh install sees `Early access · Pro preview`.
5. Change the iOS app price to Free only after the grandfathering build is live.
6. Create a non-consumable App Store Connect product:
   - Product ID: `com.monarchprime.pin.pro.lifetime`
   - Reference name: `Monarch Lifetime Pro`
   - Suggested launch price: `$24.99`
7. Submit the in-app purchase with a later app update.
8. Set `EXPO_PUBLIC_MONETIZATION_ENABLED=true` only in the build that includes the approved purchase.

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
- The concentration worksheet divides a user-entered total mass by a user-entered liquid volume. It does not calculate target amounts, syringe units, schedules, or recommendations.
- Existing customers who originally purchased the paid app receive Lifetime Pro automatically.
- Core tracking, complete history, calendar review, and site rotation remain free.

Provide App Review with a fresh free-tier test account and a separate grandfathered test path if requested.
