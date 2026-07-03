export const PEPTIDES = {
  singles: [
    // GLP-1 / Metabolic
    { id: 'reta',   name: 'Retatrutide',       defaultUnit: 'mg'  as const },
    { id: 'tirz',   name: 'Tirzepatide',       defaultUnit: 'mg'  as const },
    { id: 'sema',   name: 'Semaglutide',       defaultUnit: 'mg'  as const },
    { id: 'lira',   name: 'Liraglutide',       defaultUnit: 'mg'  as const },
    { id: 'aod',    name: 'AOD-9604',          defaultUnit: 'mcg' as const },
    // GH / GHRP
    { id: 'ipa',    name: 'Ipamorelin',        defaultUnit: 'mcg' as const },
    { id: 'cjc',    name: 'CJC-1295',          defaultUnit: 'mcg' as const },
    { id: 'serm',   name: 'Sermorelin',        defaultUnit: 'mcg' as const },
    { id: 'tesa',   name: 'Tesamorelin',       defaultUnit: 'mg'  as const },
    { id: 'ghrp2',  name: 'GHRP-2',           defaultUnit: 'mcg' as const },
    { id: 'ghrp6',  name: 'GHRP-6',           defaultUnit: 'mcg' as const },
    { id: 'hex',    name: 'Hexarelin',         defaultUnit: 'mcg' as const },
    { id: 'mk677',  name: 'MK-677',            defaultUnit: 'mg'  as const },
    // Recovery / Healing
    { id: 'bpc',    name: 'BPC-157',           defaultUnit: 'mcg' as const },
    { id: 'tb500',  name: 'TB-500',            defaultUnit: 'mg'  as const },
    { id: 'ghkcu',  name: 'GHK-Cu',            defaultUnit: 'mg'  as const },
    { id: 'kpv',    name: 'KPV',               defaultUnit: 'mcg' as const },
    { id: 'dihexa', name: 'Dihexa',            defaultUnit: 'mg'  as const },
    // Longevity
    { id: 'epit',   name: 'Epithalon',         defaultUnit: 'mg'  as const },
    { id: 'tha1',   name: 'Thymosin Alpha-1',  defaultUnit: 'mg'  as const },
    { id: 'nad',    name: 'NAD+',              defaultUnit: 'mg'  as const },
    { id: 'dsip',   name: 'DSIP',              defaultUnit: 'mcg' as const },
    { id: 'motsc',  name: 'MOTS-c',            defaultUnit: 'mg'  as const },
    // Neurological / Mood
    { id: 'selank', name: 'Selank',            defaultUnit: 'mcg' as const },
    { id: 'semax',  name: 'Semax',             defaultUnit: 'mcg' as const },
    { id: 'cerb',   name: 'Cerebrolysin',      defaultUnit: 'mg'  as const },
    // Hormonal / Other
    { id: 'kiss10', name: 'Kisspeptin-10',     defaultUnit: 'mcg' as const },
    { id: 'oxyt',   name: 'Oxytocin',          defaultUnit: 'mcg' as const },
    { id: 'gona',   name: 'Gonadorelin',       defaultUnit: 'mcg' as const },
    { id: 'trip',   name: 'Triptorelin',       defaultUnit: 'mcg' as const },
    // Cosmetic / Other
    { id: 'mt2',    name: 'Melanotan II',      defaultUnit: 'mg'  as const },
    { id: 'pt141',  name: 'PT-141',            defaultUnit: 'mg'  as const },
    { id: 'll37',   name: 'LL-37',             defaultUnit: 'mcg' as const },
  ],
  blends: [
    { id: 'cjc-ipa',       name: 'CJC-1295 + Ipamorelin',          defaultUnit: 'mcg' as const },
    { id: 'cjc-ghrp2',     name: 'CJC-1295 + GHRP-2',             defaultUnit: 'mcg' as const },
    { id: 'ipa-ghrp6',     name: 'Ipamorelin + GHRP-6',           defaultUnit: 'mcg' as const },
    { id: 'bpc-tb',        name: 'BPC-157 + TB-500 (Wolverine)',               defaultUnit: 'mcg' as const },
    { id: 'bpc-tb-ghkcu',  name: 'BPC-157 + TB-500 + GHK-Cu (GLOW)',           defaultUnit: 'mcg' as const },
    { id: 'bpc-tb-ghkcu-kpv', name: 'BPC-157 + TB-500 + GHK-Cu + KPV (KLOW)', defaultUnit: 'mcg' as const },
    { id: 'serm-ipa',      name: 'Sermorelin + Ipamorelin',        defaultUnit: 'mcg' as const },
    { id: 'epit-tha1',     name: 'Epithalon + Thymosin Alpha-1',   defaultUnit: 'mg'  as const },
    { id: 'reta-tirz',     name: 'Retatrutide + Tirzepatide',      defaultUnit: 'mg'  as const },
    { id: 'sema-bpc',      name: 'Semaglutide + BPC-157',          defaultUnit: 'mg'  as const },
    { id: 'selank-semax',  name: 'Selank + Semax',                 defaultUnit: 'mcg' as const },
  ],
};

export type Peptide = { id: string; name: string; defaultUnit: 'mg' | 'mcg' };
export type Severity = 'none' | 'mild' | 'mod' | 'sev';

export const SIDE_EFFECT_TAGS = [
  'Nausea',
  'Headache',
  'Fatigue',
  'Injection site redness',
  'Injection site swelling',
  'Injection site itching',
  'Flushing',
  'GI upset',
  'Dizziness',
  'Water retention',
  'Appetite change',
  'Insomnia',
  'Joint pain',
] as const;

export type SideEffectTag = typeof SIDE_EFFECT_TAGS[number];
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
    { id: 'sh_l',   label: 'Left Shoulder',        short: 'L Shoulder',    cx: 32, cy: 28, r: 2.8 },
    { id: 'sh_r',   label: 'Right Shoulder',       short: 'R Shoulder',    cx: 68, cy: 28, r: 2.8 },
    { id: 'arm_l',  label: 'Left Outer Arm',       short: 'L Arm',         cx: 24, cy: 38, r: 2.4 },
    { id: 'arm_r',  label: 'Right Outer Arm',      short: 'R Arm',         cx: 76, cy: 38, r: 2.4 },
    { id: 'abd_ul', label: 'Upper Left Abdomen',   short: 'Upper L Abs',   cx: 43, cy: 39, r: 2.4 },
    { id: 'abd_ur', label: 'Upper Right Abdomen',  short: 'Upper R Abs',   cx: 57, cy: 39, r: 2.4 },
    { id: 'abd_ll', label: 'Lower Left Abdomen',   short: 'Lower L Abs',   cx: 43, cy: 47, r: 2.4 },
    { id: 'abd_lr', label: 'Lower Right Abdomen',  short: 'Lower R Abs',   cx: 57, cy: 47, r: 2.4 },
    { id: 'flk_l',  label: 'Left Flank',           short: 'L Flank',       cx: 35, cy: 43, r: 2.2 },
    { id: 'flk_r',  label: 'Right Flank',          short: 'R Flank',       cx: 65, cy: 43, r: 2.2 },
    { id: 'th_l',   label: 'Left Thigh',           short: 'L Thigh',       cx: 42, cy: 70, r: 2.6 },
    { id: 'th_r',   label: 'Right Thigh',          short: 'R Thigh',       cx: 58, cy: 70, r: 2.6 },
  ],
  back: [
    { id: 'b_sh_l',  label: 'Left Rear Shoulder',  short: 'L Rear Shoulder',  cx: 32, cy: 28, r: 2.8 },
    { id: 'b_sh_r',  label: 'Right Rear Shoulder', short: 'R Rear Shoulder',  cx: 68, cy: 28, r: 2.8 },
    { id: 'b_arm_l', label: 'Left Tricep',         short: 'L Tricep',      cx: 24, cy: 38, r: 2.4 },
    { id: 'b_arm_r', label: 'Right Tricep',        short: 'R Tricep',      cx: 76, cy: 38, r: 2.4 },
    { id: 'glute_l', label: 'Left Glute',          short: 'L Glute',       cx: 43, cy: 53, r: 3 },
    { id: 'glute_r', label: 'Right Glute',         short: 'R Glute',       cx: 57, cy: 53, r: 3 },
    { id: 'b_th_l',  label: 'Left Hamstring',      short: 'L Hamstring',   cx: 42, cy: 70, r: 2.6 },
    { id: 'b_th_r',  label: 'Right Hamstring',     short: 'R Hamstring',   cx: 58, cy: 70, r: 2.6 },
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
  symptoms?: string[];
  weight: number;
  notes?: string;
  photoUri?: string;
};
