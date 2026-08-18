/** @type {import('@bacons/apple-targets').Config} */
// The App Group is declared EXPLICITLY. The plugin documents auto-mirroring
// from app.json ios.entitlements, but build 30 shipped with the widget
// MISSING the entitlement (verified via codesign on the .ipa) — the widget
// read an empty container and showed placeholders. Keep this explicit; it
// must always match app.json ios.entitlements and src/lib/widget.ts.
module.exports = {
  type: 'widget',
  name: 'MonarchWidget',
  deploymentTarget: '17.0',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.monarchprime.pin'],
  },
};
