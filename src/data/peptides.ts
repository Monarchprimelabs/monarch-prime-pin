export const PEPTIDES = {
  singles: [
    { id: 'reta',  name: 'Retatrutide',      range: '2–12 mg/wk',     defaultUnit: 'mg' as const },
    { id: 'tirz',  name: 'Tirzepatide',      range: '2.5–15 mg/wk',   defaultUnit: 'mg' as const },
    { id: 'sema',  name: 'Semaglutide',      range: '0.25–2.4 mg/wk', defaultUnit: 'mg' as const },
    { id: 'bpc',   name: 'BPC-157',          range: '250–500 mcg',    defaultUnit: 'mcg' as const },
    { id: 'ipa',   name: 'Ipamorelin',       range: '200–300 mcg',    defaultUnit: 'mcg' as const },
    { id: 'tb500', name: 'TB-500',           range: '2–2.5 mg/wk',    defaultUnit: 'mg' as const },
    { id: 'cjc',   name: 'CJC-1295',         range: '100–300 mcg',    defaultUnit: 'mcg' as const },
    { id: 'aod',   name: 'AOD-9604',         range: '250–500 mcg',    defaultUnit: 'mcg' as const },
    { id: 'tesa',  name: 'Tesamorelin',      range: '1–2 mg',         defaultUnit: 'mg' as const },
    { id: 'serm',  name: 'Sermorelin',       range: '100–500 mcg',    defaultUnit: 'mcg' as const },
    { id: 'ghkcu', name: 'GHK-Cu',           range: '1–2 mg',         defaultUnit: 'mg' as const },
    { id: 'mt2',   name: 'Melanotan II',     range: '0.5–1 mg',       defaultUnit: 'mg' as const },
    { id: 'pt141', name: 'PT-141',           range: '1–2 mg',         defaultUnit: 'mg' as const },
    { id: 'tha1',  name: 'Thymosin Alpha-1', range: '1.6 mg',         defaultUnit: 'mg' as const },
    { id: 'll37',  name: 'LL-37',            range: '100–500 mcg',    defaultUnit: 'mcg' as const },
  ],
  blends: [
    { id: 'cjc-ipa',   name: 'CJC-1295 + Ipamorelin',     defaultUnit: 'mcg' as const },
    { id: 'bpc-tb',    name: 'BPC-157 + TB-500',          defaultUnit: 'mcg' as const },
    { id: 'serm-ipa',  name: 'Sermorelin + Ipamorelin',   defaultUnit: 'mcg' as const },
    { id: 'reta-tirz', name: 'Retatrutide + Tirzepatide', defaultUnit: 'mg'  as const },
    { id: 'sema-bpc',  name: 'Semaglutide + BPC-157',     defaultUnit: 'mg'  as const },
  ],
};

export type Peptide = { id: string; name: string; range?: string; defaultUnit: 'mg' | 'mcg' };
export type Severity = 'none' | 'mild' | 'mod' | 'sev';
export type DensityLevel = 'unused' | 'light' | 'moderate' | 'heavy';

export type Zone = {
  id: string;
  label: string;
  short: string;
  cx: number;
  cy: number;
  r: number;
};

export const ZONES: { front: Zone[]; back: Zone[] } = {
  front: [
    { id: 'sh_l',   label: 'L Shoulder',  short: 'Sh L',   cx: 32, cy: 28, r: 2.8 },
    { id: 'sh_r',   label: 'R Shoulder',  short: 'Sh R',   cx: 68, cy: 28, r: 2.8 },
    { id: 'arm_l',  label: 'L Outer Arm', short: 'Arm L',  cx: 24, cy: 38, r: 2.4 },
    { id: 'arm_r',  label: 'R Outer Arm', short: 'Arm R',  cx: 76, cy: 38, r: 2.4 },
    { id: 'abd_ul', label: 'Upper L Abd', short: 'Abd UL', cx: 43, cy: 39, r: 2.4 },
    { id: 'abd_ur', label: 'Upper R Abd', short: 'Abd UR', cx: 57, cy: 39, r: 2.4 },
    { id: 'abd_ll', label: 'Lower L Abd', short: 'Abd LL', cx: 43, cy: 47, r: 2.4 },
    { id: 'abd_lr', label: 'Lower R Abd', short: 'Abd LR', cx: 57, cy: 47, r: 2.4 },
    { id: 'flk_l',  label: 'L Flank',     short: 'Flk L',  cx: 35, cy: 43, r: 2.2 },
    { id: 'flk_r',  label: 'R Flank',     short: 'Flk R',  cx: 65, cy: 43, r: 2.2 },
    { id: 'th_l',   label: 'L Thigh',     short: 'Th L',   cx: 42, cy: 70, r: 2.6 },
    { id: 'th_r',   label: 'R Thigh',     short: 'Th R',   cx: 58, cy: 70, r: 2.6 },
  ],
  back: [
    { id: 'b_sh_l',  label: 'L Shoulder',   short: 'Sh L',  cx: 32, cy: 28, r: 2.8 },
    { id: 'b_sh_r',  label: 'R Shoulder',   short: 'Sh R',  cx: 68, cy: 28, r: 2.8 },
    { id: 'b_arm_l', label: 'L Tricep',     short: 'Tri L', cx: 24, cy: 38, r: 2.4 },
    { id: 'b_arm_r', label: 'R Tricep',     short: 'Tri R', cx: 76, cy: 38, r: 2.4 },
    { id: 'glute_l', label: 'L Glute',      short: 'Gl L',  cx: 43, cy: 53, r: 3 },
    { id: 'glute_r', label: 'R Glute',      short: 'Gl R',  cx: 57, cy: 53, r: 3 },
    { id: 'b_th_l',  label: 'L Post Thigh', short: 'Th L',  cx: 42, cy: 70, r: 2.6 },
    { id: 'b_th_r',  label: 'R Post Thigh', short: 'Th R',  cx: 58, cy: 70, r: 2.6 },
  ],
};

export const ALL_ZONES = [...ZONES.front, ...ZONES.back];

export type Injection = {
  id: string;
  peptide: string;
  dose: string;
  unit: 'mcg' | 'mg';
  date: string;
  time: string;
  site: string;
  sev: Severity;
  weight: number;
  notes?: string;
  photoUri?: string;
};

// Demo seed data — used in Demo / Guest mode and as initial state
export const SEED_INJECTIONS: Injection[] = [
  { id: '1', peptide: 'BPC-157 + TB-500',      dose: '250', unit: 'mcg', date: '2026-05-01', time: '08:56', site: 'arm_r',   sev: 'none', weight: 230 },
  { id: '2', peptide: 'CJC-1295 + Ipamorelin', dose: '250', unit: 'mcg', date: '2026-05-01', time: '08:55', site: 'thigh_r', sev: 'none', weight: 230 },
  { id: '3', peptide: 'Semaglutide',           dose: '2',   unit: 'mg',  date: '2026-05-01', time: '08:48', site: 'abd_ll',  sev: 'sev',  weight: 230 },
];

export const ZONE_DENSITY: Record<string, DensityLevel> = {
  abd_ll: 'light',
  th_l: 'light',
  th_r: 'light',
  abd_ul: 'moderate',
  arm_r: 'heavy',
};
