// Heat decay model tests — run with: node scripts/test-heat.js
// No framework needed. Asserts every transition in the Heatmap v2 spec §3.4
// plus the multi-site, window, cutoff, and steady-state rules.

const {
  bandForHeat,
  decayedLoad,
  computeHeatByZone,
  DEFAULT_HALF_LIFE_DAYS,
  NEGLIGIBLE_AFTER_HALF_LIVES,
  MS_PER_DAY,
} = require('../src/lib/heatMath.js');

let failures = 0;
let passes = 0;

function check(name, condition, detail) {
  if (condition) {
    passes += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Days for a starting heat to decay below a threshold: t = hl * log2(start/threshold)
const daysToReach = (start, threshold, hl) => hl * Math.log2(start / threshold);

const HL = DEFAULT_HALF_LIFE_DAYS;
const NOW = Date.UTC(2026, 6, 26, 12, 0, 0);
const ago = days => NOW - days * MS_PER_DAY;
const entry = (daysAgo, zoneIds = ['abd_ll']) => ({ zoneIds, timestamp: ago(daysAgo) });

console.log('— band thresholds —');
check('heat 0 is clear', bandForHeat(0) === 'clear');
check('heat 0.19 is clear', bandForHeat(0.19) === 'clear');
check('heat 0.20 is blue', bandForHeat(0.2) === 'blue');
check('heat 0.75 is green', bandForHeat(0.75) === 'green');
check('single fresh injection (1.0) is green', bandForHeat(1.0) === 'green');
check('heat 1.75 is yellow', bandForHeat(1.75) === 'yellow');
check('heat 3.0 is orange', bandForHeat(3.0) === 'orange');
check('heat 5.0 is red', bandForHeat(5.0) === 'red');

console.log('— §3.4 reset timings (halfLife = 7d) —');
const oneClear = daysToReach(1.0, 0.2, HL);
check(`one injection clears in ~16 days (got ${oneClear.toFixed(1)})`, oneClear > 16 && oneClear < 16.5);
const redClear = daysToReach(6.0, 0.2, HL);
check(`red (6.0) clears in ~35 days (got ${redClear.toFixed(1)})`, redClear > 34 && redClear < 35);
const redOrange = daysToReach(6.0, 5.0, HL);
check(`red→orange ~1.5-2 days (got ${redOrange.toFixed(1)})`, redOrange > 1 && redOrange < 2.5);
const orangeYellow = daysToReach(6.0, 3.0, HL) - redOrange;
check(`orange→yellow ~5 days (got ${orangeYellow.toFixed(1)})`, orangeYellow > 4.5 && orangeYellow < 5.5);
const yellowGreen = daysToReach(6.0, 1.75, HL) - daysToReach(6.0, 3.0, HL);
check(`yellow→green ~6 days (got ${yellowGreen.toFixed(1)})`, yellowGreen > 5 && yellowGreen < 6.5);
const greenBlue = daysToReach(6.0, 0.75, HL) - daysToReach(6.0, 1.75, HL);
check(`green→blue ~8 days (got ${greenBlue.toFixed(1)})`, greenBlue > 7.5 && greenBlue < 9);
const blueClear = daysToReach(6.0, 0.2, HL) - daysToReach(6.0, 0.75, HL);
check(`blue→clear ~13 days (got ${blueClear.toFixed(1)})`, blueClear > 12.5 && blueClear < 14);

console.log('— decay function matches those timings —');
check('load at day 16 still blue', bandForHeat(decayedLoad(16, HL)) === 'blue');
check('load at day 17 is clear', bandForHeat(decayedLoad(17, HL)) === 'clear');
check('6.0 at day 34 still blue', bandForHeat(6 * decayedLoad(34, HL)) === 'blue');
check('6.0 at day 35 is clear', bandForHeat(6 * decayedLoad(35, HL)) === 'clear');

console.log('— steady-state cadences map to the intended colors —');
const cadenceHeat = intervalDays => {
  const entries = [];
  for (let d = 0; d < 20 * 7; d += intervalDays) entries.push(entry(d));
  return computeHeatByZone(entries, NOW, HL)['abd_ll'];
};
const weekly = cadenceHeat(7);
check(`weekly logging ≈ 2.0 heat → yellow (got ${weekly.toFixed(2)})`, bandForHeat(weekly) === 'yellow');
const everyOtherDay = cadenceHeat(2);
check(`every-other-day ≈ 5.6 heat → red (got ${everyOtherDay.toFixed(2)})`, bandForHeat(everyOtherDay) === 'red');
const biweekly = cadenceHeat(14);
check(`every-2-weeks ≈ 1.3 heat → green (got ${biweekly.toFixed(2)})`, bandForHeat(biweekly) === 'green');

console.log('— multi-site rule (§3.2): full load to every named zone —');
const multi = computeHeatByZone([entry(0, ['abd_ll', 'flk_l'])], NOW, HL);
check('both zones get full 1.0', Math.abs(multi['abd_ll'] - 1) < 1e-9 && Math.abs(multi['flk_l'] - 1) < 1e-9);

console.log('— window, cutoff, edge cases —');
const windowed = computeHeatByZone([entry(2), entry(10)], NOW, HL, 7);
check('7d window excludes a 10-day-old record', Math.abs(windowed['abd_ll'] - decayedLoad(2, HL)) < 1e-9);
const cutoffAge = HL * NEGLIGIBLE_AFTER_HALF_LIVES + 1;
check(`records older than ${HL * NEGLIGIBLE_AFTER_HALF_LIVES}d contribute 0`, decayedLoad(cutoffAge, HL) === 0);
check('future-dated record contributes 0', decayedLoad(-1, HL) === 0);
const empty = computeHeatByZone([], NOW, HL);
check('no records → no heat entries', Object.keys(empty).length === 0);

console.log('— configurable half-life still behaves —');
check('3d half-life: one injection clears in ~7 days', daysToReach(1, 0.2, 3) > 6.5 && daysToReach(1, 0.2, 3) < 7.5);
check('21d half-life: one injection clears in ~49 days', daysToReach(1, 0.2, 21) > 48 && daysToReach(1, 0.2, 21) < 49);

console.log(`\n${passes} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
