/** @type {import('@bacons/apple-targets').Config} */
// App group entitlement is mirrored automatically from app.json
// ios.entitlements['com.apple.security.application-groups'].
module.exports = {
  type: 'widget',
  name: 'MonarchWidget',
  deploymentTarget: '17.0',
};
