// Pure decay math for the site heatmap. Plain CommonJS with zero imports so
// the exact same code runs inside the app (via src/lib/heat.ts) and under
// `node scripts/test-heat.js` with no test framework or build step.

// Steady-state heat for a zone hit at a fixed interval, halfLife = 7d:
//   daily            → ~10.6
//   every other day  →  ~5.6
//   2× per week      →  ~3.4
//   1× per week      →  ~2.0
//   every 2 weeks    →  ~1.3
// Band edges sit between these values so color communicates logging cadence,
// not raw all-time count.
const HEAT_BANDS = [
  { id: 'clear', max: 0.2 },
  { id: 'blue', max: 0.75 },
  { id: 'green', max: 1.75 },
  { id: 'yellow', max: 3.0 },
  { id: 'orange', max: 5.0 },
  { id: 'red', max: Infinity },
];

const DEFAULT_HALF_LIFE_DAYS = 7;
const HALF_LIFE_OPTIONS = [3, 7, 14, 21];
// Beyond this many half-lives a record contributes < 0.016 heat — negligible.
const NEGLIGIBLE_AFTER_HALF_LIVES = 6;
const MS_PER_DAY = 86400000;

function bandForHeat(heat) {
  for (const band of HEAT_BANDS) {
    if (heat < band.max) return band.id;
  }
  return 'red';
}

function decayedLoad(ageDays, halfLifeDays) {
  if (ageDays < 0) return 0; // future-dated records contribute nothing
  if (ageDays > halfLifeDays * NEGLIGIBLE_AFTER_HALF_LIVES) return 0;
  return Math.exp((-Math.LN2 * ageDays) / halfLifeDays);
}

// entries: [{ zoneIds: string[], timestamp: number }]
// windowDays (optional): entries older than this are excluded entirely; decay
// still applies to everything inside the window.
function computeHeatByZone(entries, nowMs, halfLifeDays, windowDays) {
  const heat = {};
  for (const entry of entries) {
    const ageDays = (nowMs - entry.timestamp) / MS_PER_DAY;
    if (windowDays !== undefined && ageDays > windowDays) continue;
    const load = decayedLoad(ageDays, halfLifeDays);
    if (load === 0) continue;
    // Each named zone on a record receives the full load: every one of those
    // sites was actually injected, so the load is not divided between them.
    for (const zoneId of entry.zoneIds) {
      heat[zoneId] = (heat[zoneId] || 0) + load;
    }
  }
  return heat;
}

module.exports = {
  HEAT_BANDS,
  DEFAULT_HALF_LIFE_DAYS,
  HALF_LIFE_OPTIONS,
  NEGLIGIBLE_AFTER_HALF_LIVES,
  MS_PER_DAY,
  bandForHeat,
  decayedLoad,
  computeHeatByZone,
};
