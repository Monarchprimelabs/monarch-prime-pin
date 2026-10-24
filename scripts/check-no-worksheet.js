// Proves the no-worksheet build leaves the worksheet out of the JS bundle.
// Run with: node scripts/check-no-worksheet.js
// Exports an iOS production bundle twice (default, then with
// EXPO_PUBLIC_REMOVE_WORKSHEET=true) and looks for the marker that only
// src/screens/WorksheetTool.tsx contains.

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MARKER = 'mpp-worksheet-module';

function bundleHasMarker(removeWorksheet) {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mpp-bundle-'));
  execSync(`npx expo export --platform ios --output-dir ${out} --no-bytecode --clear`, {
    stdio: 'inherit',
    env: { ...process.env, EXPO_PUBLIC_REMOVE_WORKSHEET: removeWorksheet ? 'true' : 'false', EXPO_OFFLINE: '1' },
  });
  const files = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(js|hbc)$/.test(entry.name)) files.push(full);
  });
  walk(out);
  const found = files.some(file => fs.readFileSync(file, 'latin1').includes(MARKER));
  fs.rmSync(out, { recursive: true, force: true });
  return found;
}

const withWorksheet = bundleHasMarker(false);
const withoutWorksheet = bundleHasMarker(true);
console.log(`default build has the worksheet: ${withWorksheet}`);
console.log(`no-worksheet build has the worksheet: ${withoutWorksheet}`);
process.exit(withWorksheet && !withoutWorksheet ? 0 : 1);
