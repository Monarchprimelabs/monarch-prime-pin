const { chromium } = require('playwright');
const fs = require('fs');
const out = process.argv[2]; const only = process.argv[3];
const day = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
const now = new Date().toISOString();
const seed = {
  '@mpp/vials': JSON.stringify([
    { id: 'v1', label: 'Compound A', total: 5000, base: 'mcg', enteredUnit: 'mg', diluentMl: 2, openedAt: day(18), status: 'active', createdAt: now, updatedAt: now },
    { id: 'v2', label: 'Compound B', total: 30000, base: 'mcg', enteredUnit: 'mg', diluentMl: 3, openedAt: day(30), status: 'active', createdAt: now, updatedAt: now },
  ]),
  '@mpp/lab_results': JSON.stringify([
    [150, 24], [110, 31], [70, 38], [20, 46]].map(([n, v], i) => ({ id: 'l' + i, date: day(n), panelName: 'Wellness panel', markerName: 'Vitamin D', value: v, unit: 'ng/mL', refLow: 30, refHigh: 100, createdAt: now }))
    .concat([[150, 101], [110, 97], [70, 93], [20, 90]].map(([n, v], i) => ({ id: 'g' + i, date: day(n), panelName: 'Wellness panel', markerName: 'Fasting Glucose', value: v, unit: 'mg/dL', refLow: 70, refHigh: 99, createdAt: now })))),
};
const tab = (p, t) => p.locator(`[aria-label="${t}"]`).last().click();
const wait = (p, ms) => p.waitForTimeout(ms);
// Smooth scroll of the main scroller under the pointer.
const scroll = async (p, dy, ms) => { const steps = Math.round(ms / 16); await p.mouse.move(195, 500); for (let i = 0; i < steps; i++) { await p.mouse.wheel(0, 1.4 * dy / steps); await p.waitForTimeout(16); } };
const scenes = {
  home: async p => { await wait(p, 3200); await scroll(p, 930, 2600); await wait(p, 2200); await p.getByText('Back', { exact: true }).first().click(); await wait(p, 2400); await p.getByText('Front', { exact: true }).first().click(); await wait(p, 2000); },
  log: async p => { await wait(p, 600); await tab(p, 'Log'); await wait(p, 1200); await p.getByText('Select peptide…').click(); await wait(p, 1100); await p.getByPlaceholder('Search compounds…').pressSequentially('BPC', { delay: 160 }); await wait(p, 900); await p.getByText('BPC-157', { exact: false }).first().click(); await wait(p, 1000); await scroll(p, 430, 1400); await wait(p, 700); await p.locator('[aria-label="Lower Right Abdomen"]').first().click(); await wait(p, 1300); await scroll(p, 420, 1300); await p.getByText('None', { exact: true }).first().click().catch(() => {}); await wait(p, 600); await scroll(p, 700, 1500); await wait(p, 1200); },
  history: async p => { await wait(p, 500); await tab(p, 'History'); await wait(p, 1600); await scroll(p, 500, 2000); await wait(p, 600); await p.getByText('Calendar', { exact: true }).first().click(); await wait(p, 2200); },
  reports: async p => { await wait(p, 500); await tab(p, 'Reports'); await wait(p, 1500); await scroll(p, 330, 1500); await wait(p, 1800); await scroll(p, 300, 1300); await wait(p, 1400); for (const r of ['3M', '1M', 'All']) { await p.getByText(r, { exact: true }).first().click().catch(() => {}); await wait(p, 1100); } },
  vials: async p => { await wait(p, 500); await tab(p, 'Tools'); await wait(p, 1300); await p.getByText('Vials', { exact: true }).first().click(); await wait(p, 3000); await scroll(p, 250, 1200); await wait(p, 1500); },
  labs: async p => { await wait(p, 500); await tab(p, 'Tools'); await wait(p, 1000); await p.getByText('Lab Results', { exact: true }).first().click(); await wait(p, 2000); await p.getByText('Vitamin D', { exact: true }).first().click(); await wait(p, 3500); await scroll(p, 200, 1000); await wait(p, 1500); },
  protocols: async p => { await wait(p, 500); await tab(p, 'Tools'); await wait(p, 1000); await p.getByText('Protocols', { exact: true }).first().click(); await wait(p, 3000); },
  learn: async p => { await wait(p, 500); await tab(p, 'Tools'); await wait(p, 1000); await p.getByText('Learn', { exact: true }).first().click(); await wait(p, 2200); await scroll(p, 600, 2000); await wait(p, 1000); },
};
(async () => {
  const b = await chromium.launch({ args: ['--force-device-scale-factor=2'] });
  // Warm-up without recording: seed sample data, dismiss the one-time welcome sheet, keep the storage.
  const warm = await b.newContext({ viewport: { width: 390, height: 844 } });
  await warm.addInitScript(s => { for (const k in s) if (!localStorage.getItem(k)) localStorage.setItem(k, s[k]); }, seed);
  const wp = await warm.newPage(); await wp.goto('http://localhost:8651/', { waitUntil: 'networkidle' }); await wp.waitForTimeout(3500);
  for (let i = 0; i < 3; i++) { const btn = wp.getByText('Love it'); if (await btn.count()) { await btn.click(); await wp.waitForTimeout(1200); } }
  await wp.reload({ waitUntil: 'networkidle' }); await wp.waitForTimeout(3000);
  console.log('warm sheet still there:', await wp.getByText('Love it').count());
  const state = await warm.storageState(); await warm.close();
  for (const [name, run] of Object.entries(scenes)) {
    if (only && only !== name) continue;
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, storageState: state, recordVideo: { dir: out + '/tmp-' + name, size: { width: 780, height: 1688 } } });
    const p = await ctx.newPage(); const t0 = Date.now();
    await p.goto('http://localhost:8651/', { waitUntil: 'networkidle' });
    let err = '';
    try { await run(p); } catch (e) { err = e.message.split('\n')[0]; }
    await p.screenshot({ path: `${out}/${name}-end.png` });
    const v = p.video(); await ctx.close();
    fs.renameSync(await v.path(), `${out}/${name}.webm`);
    console.log(name, ((Date.now() - t0) / 1000).toFixed(1) + 's', err);
  }
  await b.close();
})();
