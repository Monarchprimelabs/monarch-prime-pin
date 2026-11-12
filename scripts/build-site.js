// Builds the public website into site-dist/: the marketing page at / and the
// web app at /app. Used by the web host (build command: npm run build:site,
// output folder: site-dist).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'site-dist');
const appOut = path.join(out, 'app');

fs.rmSync(out, { recursive: true, force: true });
execSync(`npx expo export -p web --output-dir "${appOut}"`, {
  cwd: root, stdio: 'inherit', env: { ...process.env, EXPO_BASE_URL: '/app', EXPO_PUBLIC_DEMO: '' },
});
fs.cpSync(path.join(root, 'site'), out, { recursive: true });
console.log('Website built in site-dist/');
