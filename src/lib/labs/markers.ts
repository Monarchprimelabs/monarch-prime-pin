// Marker NAMES only, to save typing. No values, ranges or meanings: the user
// enters the value and the reference range from their own report.
export const COMMON_MARKERS = [
  'Total testosterone', 'Free testosterone', 'Estradiol (E2)', 'SHBG', 'LH', 'FSH', 'Prolactin',
  'IGF-1', 'Growth hormone', 'Cortisol', 'DHEA-S', 'Progesterone',
  'TSH', 'Free T4', 'Free T3',
  'Hemoglobin', 'Hematocrit', 'Red blood cells', 'White blood cells', 'Platelets',
  'Fasting glucose', 'HbA1c', 'Fasting insulin',
  'Total cholesterol', 'LDL cholesterol', 'HDL cholesterol', 'Triglycerides', 'ApoB', 'Lp(a)',
  'ALT', 'AST', 'GGT', 'Creatinine', 'eGFR', 'BUN', 'Cystatin C',
  'PSA', 'Vitamin D (25-OH)', 'Vitamin B12', 'Ferritin', 'Iron', 'hs-CRP', 'Homocysteine',
  'Sodium', 'Potassium', 'Magnesium', 'Calcium', 'Uric acid',
];

/** Suggestions for what the user has typed so far, their own past names first. */
export function suggestMarkers(query: string, used: string[], limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const pool = [...new Set([...used, ...COMMON_MARKERS])];
  return pool
    .filter(name => name.toLowerCase().includes(q) && name.toLowerCase() !== q)
    .sort((a, b) => Number(!a.toLowerCase().startsWith(q)) - Number(!b.toLowerCase().startsWith(q)))
    .slice(0, limit);
}
