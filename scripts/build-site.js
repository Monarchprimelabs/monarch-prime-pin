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
// Static hosts (Cloudflare) redirect paths containing "@" to "%40", which
// loops in browsers and leaves the icon fonts unloaded. Serve the fonts from
// a folder without "@" and point the bundles at it.
const scoped = path.join(appOut, 'assets/node_modules/@expo');
if (fs.existsSync(scoped)) {
  fs.renameSync(scoped, path.join(appOut, 'assets/node_modules/expo-scoped'));
  const jsDir = path.join(appOut, '_expo/static/js/web');
  for (const file of fs.readdirSync(jsDir)) {
    const full = path.join(jsDir, file);
    const code = fs.readFileSync(full, 'utf8');
    const fixed = code.split('/assets/node_modules/@expo/').join('/assets/node_modules/expo-scoped/');
    if (fixed !== code) fs.writeFileSync(full, fixed);
  }
}
fs.cpSync(path.join(root, 'site'), out, { recursive: true });
console.log('Website built in site-dist/');
