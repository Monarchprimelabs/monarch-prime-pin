import { healthWeightToOffer, inRange, mergeWeights, offeredKey, weightOn } from '../weight';

const health = [{ date: '2026-01-15', value: 190 }];
const logged = [
  { date: '2026-10-01', time: '08:00', weight: 184 },
  { date: '2026-11-01', time: '08:00', weight: 181 },
  { date: '2026-11-01', time: '20:00', weight: 180.5 },
];

test('logged weights and Apple Health merge into one history, newest last', () => {
  const points = mergeWeights(health, logged);
  expect(points.map(p => `${p.date}=${p.value}/${p.source}`)).toEqual([
    '2026-01-15=190/health', '2026-10-01=184/log', '2026-11-01=180.5/log',
  ]);
});

test('a typed weight wins over Apple Health on the same day', () => {
  const points = mergeWeights([{ date: '2026-11-01', value: 183 }], logged);
  expect(weightOn(points, '2026-11-10')).toEqual({ date: '2026-11-01', value: 180.5, source: 'log' });
});

test('ranges end today', () => {
  const points = mergeWeights(health, logged);
  expect(inRange(points, '1M', '2026-11-10').map(p => p.date)).toEqual(['2026-11-01']);
  expect(inRange(points, '3M', '2026-11-10').map(p => p.date)).toEqual(['2026-10-01', '2026-11-01']);
  expect(inRange(points, 'All', '2026-11-10')).toHaveLength(3);
});

test('an old Apple Health reading is not offered once newer weights are logged', () => {
  expect(healthWeightToOffer(health, logged, '2026-11-10', null)).toBeNull();
});

test('a newer Apple Health reading is offered once, then not again', () => {
  const fresh = [{ date: '2026-11-08', value: 179 }];
  const offer = healthWeightToOffer(fresh, logged, '2026-11-10', null);
  expect(offer).toEqual({ date: '2026-11-08', value: 179 });
  expect(healthWeightToOffer(fresh, logged, '2026-11-10', offeredKey(offer!))).toBeNull();
});

test('with nothing logged yet, the Apple Health reading is offered', () => {
  expect(healthWeightToOffer(health, [], '2026-11-10', null)).toEqual(health[0]);
});
