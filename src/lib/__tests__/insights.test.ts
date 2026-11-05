jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

import { generateInsights, InsightInput } from '../insights';
import { translateFor } from '../i18n';
import type { Injection } from '../../data/peptides';

const FORBIDDEN = [
  'should', 'recommend', 'increase', 'decrease', 'optimal', 'safe dose', 'take more', 'take less', 'try ',
  'deberías', 'recomend', 'aumenta', 'disminuye',
  // Portuguese equivalents, since the app also ships pt-BR.
  'deveria', 'recomend', 'aumente', 'diminua',
];

const rec = (id: string, date: string, site: string, extra: Partial<Injection> = {}): Injection =>
  ({ id, peptide: id.startsWith('a') ? 'A' : 'B', dose: '250', unit: 'mcg', date, time: '08:00', site, sev: 'none', weight: 0, ...extra } as Injection);

const fixture: InsightInput = {
  today: '2026-11-20',
  monthLabel: 'November',
  injections: [
    rec('a1', '2026-11-19', 'abd_ul', { vialId: 'v1' }), rec('a2', '2026-11-17', 'abd_ul', { vialId: 'v1' }),
    rec('b1', '2026-11-15', 'abd_lr'), rec('b2', '2026-10-01', 'arm_l'),
  ],
  protocols: [],
  skips: [],
  vials: [{ id: 'v1', label: 'Vial A', compound: 'A', total: 5000, base: 'mcg', diluentMl: 2, status: 'active', createdAt: '2026-11-01' } as never],
  sleepByDay: { '2026-11-19': 7.1, '2026-11-17': 7.3, '2026-11-15': 6.9, '2026-11-18': 7.0, '2026-11-16': 7.2, '2026-11-14': 6.8 },
};

test('every insight is a fact about the user\'s entries, with no advice words, in all three languages', () => {
  for (const language of ['en', 'es', 'pt'] as const) {
    const t = (key: string, vars?: Record<string, string | number>) => translateFor(language, key, vars);
    const insights = generateInsights(fixture, t);
    expect(insights.map(i => i.id)).toEqual(expect.arrayContaining(['month', 'siteTop', 'siteIdle', 'vial-v1', 'sleep']));
    for (const insight of insights) {
      expect(insight.text).not.toMatch(/insight\./); // translated
      for (const word of FORBIDDEN) expect(insight.text.toLowerCase()).not.toContain(word);
    }
  }
});

test('the footer and card title carry no advice words either', () => {
  for (const language of ['en', 'es', 'pt'] as const) {
    for (const key of ['insight.footer', 'insight.title']) {
      const text = translateFor(language, key).toLowerCase();
      for (const word of FORBIDDEN) expect(text).not.toContain(word);
    }
  }
});

test('english wording is descriptive', () => {
  const t = (key: string, vars?: Record<string, string | number>) => translateFor('en', key, vars);
  const byId = Object.fromEntries(generateInsights(fixture, t).map(i => [i.id, i.text]));
  expect(byId.month).toBe('3 entries across 2 compounds in November');
  expect(byId['vial-v1']).toBe('Vial A: about 18 logged entries remaining at your recorded amounts');
});
