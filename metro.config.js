const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// No-worksheet build (eas.json "ios-production-no-worksheet"): every import of
// src/screens/WorksheetTool resolves to an empty stub, so the worksheet's code
// is not in the bundle at all. scripts/check-no-worksheet.js verifies it.
if (process.env.EXPO_PUBLIC_REMOVE_WORKSHEET === 'true') {
  const stub = path.join(__dirname, 'src/screens/WorksheetTool.removed.ts');
  const resolveDefault = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (/(^|\/)WorksheetTool$/.test(moduleName)) return { type: 'sourceFile', filePath: stub };
    return (resolveDefault ?? context.resolveRequest)(context, moduleName, platform);
  };
}

module.exports = config;
