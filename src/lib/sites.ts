import { ALL_ZONES, DensityLevel, Injection } from '../data/peptides';

const normalize = (value: string) => value.trim().toLowerCase();

const zoneBySavedValue = new Map<string, string>();
ALL_ZONES.forEach(zone => {
  [zone.id, zone.label, zone.short].forEach(value => {
    const key = normalize(value);
    if (!zoneBySavedValue.has(key)) zoneBySavedValue.set(key, zone.id);
  });
});

// Older builds used the same shoulder labels for both views, so those records
// resolve to the front shoulder. New back-view labels are unique.
const legacyAliases: Record<string, string> = {
  'shoulder l': 'sh_l',
  'shoulder r': 'sh_r',
  'arm l': 'arm_l',
  'arm r': 'arm_r',
  'flank l': 'flk_l',
  'flank r': 'flk_r',
  'thigh l': 'th_l',
  'thigh r': 'th_r',
};

export function getInjectionSiteIds(injection: Pick<Injection, 'site'>): string[] {
  const ids = injection.site
    .split(',')
    .map(normalize)
    .map(value => zoneBySavedValue.get(value) ?? legacyAliases[value])
    .filter((id): id is string => !!id);
  return [...new Set(ids)];
}

export function getSiteUsage(injections: Injection[]): Record<string, number> {
  const counts: Record<string, number> = {};
  injections.forEach(injection => {
    getInjectionSiteIds(injection).forEach(id => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return counts;
}

export function getSiteDensity(injections: Injection[]): Record<string, DensityLevel> {
  const usage = getSiteUsage(injections);
  return Object.fromEntries(
    ALL_ZONES.map(zone => {
      const count = usage[zone.id] || 0;
      const level: DensityLevel =
        count === 0 ? 'unused' :
        count <= 2 ? 'light' :
        count <= 4 ? 'moderate' :
        'heavy';
      return [zone.id, level];
    })
  );
}
