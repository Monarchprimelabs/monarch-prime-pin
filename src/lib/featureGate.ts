import type { FounderStatus } from './founderRules';

// Every Premium gate in the app goes through allows(). Gated features stay
// visible with a lock (src/components/PremiumLock.tsx), never hidden, so
// reviewers can see them (Guideline 2.5.19).
//
// FREE for everyone, no gate: unlimited logging, Log This Again, the body-map
// heat map for 7 and 30 days, calendar and history, photo capture and the
// photo gallery, 2 active plans with reminders and the Today view, vials with
// run-out alerts, the concentration worksheet, unit conversion, templates and
// the older tools, symptom notes, streaks, app lock, CSV export,
// backup/restore, the share card, Apple Health weight / body fat / steps,
// basic reports, every theme and language.

export type Feature =
  | 'unlimitedActivePlans'
  | 'fullHistoryHeatmap'
  | 'heatmapReplay90Day'
  | 'perCompoundCharts'
  | 'advancedAnalytics'
  | 'progressPhotoCompare'
  | 'monthlyPDF'
  | 'labResults'
  | 'insights'
  | 'expandedHealth'
  | 'labReminders'
  | 'fullWeeklySummary'
  | 'extraThemes'
  | 'statsCardNoWatermark'
  | 'cloudSync';

export const ALL_FEATURES: Feature[] = [
  'unlimitedActivePlans', 'fullHistoryHeatmap', 'heatmapReplay90Day', 'perCompoundCharts',
  'advancedAnalytics', 'progressPhotoCompare', 'monthlyPDF', 'labResults', 'insights',
  'expandedHealth', 'labReminders', 'fullWeeklySummary', 'extraThemes', 'statsCardNoWatermark',
  'cloudSync',
];

/**
 * What a 1.x free user could already use, which free founders keep forever
 * (docs/V2_PLAN.md section 4): the heat map at every range including All,
 * every theme, and the share card without the new "Made with" footer.
 */
export const FOUNDER_FREE_FEATURES: ReadonlySet<Feature> = new Set<Feature>([
  'fullHistoryHeatmap',
  'extraThemes',
  'statsCardNoWatermark',
]);

/** Active plans (protocols) a free user can have at once. */
export const FREE_ACTIVE_PLANS = 2;

export function allows(feature: Feature, who: { premium: boolean; founder: FounderStatus }): boolean {
  if (who.premium) return true;
  if (who.founder === 'freeFounder' || who.founder === 'paidFounder') return FOUNDER_FREE_FEATURES.has(feature);
  return false;
}
