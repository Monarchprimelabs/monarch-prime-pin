// i18n parity check — run with: node scripts/check-i18n.js
// AUDIT_CHECKLIST §1: EN, ES and PT must have identical key sets, and every
// {placeholder} in an English string must survive in each translation.

const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '../src/lib/i18n.tsx'), 'utf8');
const entry = /^\s*'([^']+)':\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/gm;

function dictionary(name) {
  const start = source.indexOf(`const ${name}: Record<string, string> = {`);
  const end = source.indexOf('\n};', start);
  if (start < 0 || end < 0) throw new Error(`dictionary ${name} not found`);
  const body = source.slice(start, end);
  const out = new Map();
  for (const m of body.matchAll(entry)) out.set(m[1], m[2]);
  return out;
}

const placeholders = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
const en = dictionary('en');
let failures = 0;
for (const lang of ['es', 'pt']) {
  const dict = dictionary(lang);
  for (const key of en.keys()) {
    if (!dict.has(key)) { failures += 1; console.log(`  missing in ${lang}: ${key}`); continue; }
    if (placeholders(en.get(key)) !== placeholders(dict.get(key))) {
      failures += 1;
      console.log(`  placeholder mismatch in ${lang}: ${key}`);
    }
  }
  for (const key of dict.keys()) {
    if (!en.has(key)) { failures += 1; console.log(`  extra in ${lang}: ${key}`); }
  }
}
console.log(`${en.size} keys; ${failures} problem(s)`);
process.exit(failures ? 1 : 0);
