import { ALL_ZONES, DensityLevel, Injection } from '../data/peptides';

const normalize = (value: string) => value.trim().toLowerCase();

const zoneBySavedValue = new Map<string, string>();
ALL_ZONES.forEach(zone => {
  [zone.id, zone.label, zone.short].forEach(value => {
    const key = normalize(value);
    if (!zoneBySavedValue.has(key)) zoneBySavedValue.set(key, zone.id);
  });
});

// Saved records store site names as text, so every label/short ever shipped
// must keep resolving here. Do not remove entries — only add new ones when
// zone names change. ("Th L"/"Th R" were shared by front and posterior thigh
// in old builds; they resolve to the front thigh, matching old behavior.)
const legacyAliases: Record<string, string> = {
  // Pre-rebrand builds
  'shoulder l': 'sh_l',
  'shoulder r': 'sh_r',
  'arm l': 'arm_l',
  'arm r': 'arm_r',
  'flank l': 'flk_l',
  'flank r': 'flk_r',
  'thigh l': 'th_l',
  'thigh r': 'th_r',
  // Names used until the July 2026 readability rename
  'sh l': 'sh_l',
  'sh r': 'sh_r',
  'l outer arm': 'arm_l',
  'r outer arm': 'arm_r',
  'upper l abd': 'abd_ul',
  'upper r abd': 'abd_ur',
  'lower l abd': 'abd_ll',
  'lower r abd': 'abd_lr',
  'abd ul': 'abd_ul',
  'abd ur': 'abd_ur',
  'abd ll': 'abd_ll',
  'abd lr': 'abd_lr',
  'flk l': 'flk_l',
  'flk r': 'flk_r',
  'th l': 'th_l',
  'th r': 'th_r',
  'l back shoulder': 'b_sh_l',
  'r back shoulder': 'b_sh_r',
  'back sh l': 'b_sh_l',
  'back sh r': 'b_sh_r',
  'tri l': 'b_arm_l',
  'tri r': 'b_arm_r',
  'gl l': 'glute_l',
  'gl r': 'glute_r',
  'l post thigh': 'b_th_l',
  'r post thigh': 'b_th_r',
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
