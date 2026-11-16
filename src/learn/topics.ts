// Research topics the library groups compounds by. Neutral wording: what
// has been studied, not what anything is for.
export type Topic = { id: string; icon: string; titleKey: string; blurbKey: string };

export const TOPICS: Topic[] = [
  { id: 'tissue-recovery', icon: 'bandage-outline', titleKey: 'learn.topic.tissue', blurbKey: 'learn.topic.tissueBlurb' },
  { id: 'weight-management', icon: 'scale-outline', titleKey: 'learn.topic.weight', blurbKey: 'learn.topic.weightBlurb' },
  { id: 'metabolic-health', icon: 'pulse-outline', titleKey: 'learn.topic.metabolic', blurbKey: 'learn.topic.metabolicBlurb' },
  { id: 'growth-hormone', icon: 'trending-up-outline', titleKey: 'learn.topic.gh', blurbKey: 'learn.topic.ghBlurb' },
  { id: 'longevity', icon: 'hourglass-outline', titleKey: 'learn.topic.longevity', blurbKey: 'learn.topic.longevityBlurb' },
  { id: 'mitochondria', icon: 'flash-outline', titleKey: 'learn.topic.mito', blurbKey: 'learn.topic.mitoBlurb' },
  { id: 'skin-and-hair', icon: 'sparkles-outline', titleKey: 'learn.topic.skin', blurbKey: 'learn.topic.skinBlurb' },
  { id: 'gut-health', icon: 'leaf-outline', titleKey: 'learn.topic.gut', blurbKey: 'learn.topic.gutBlurb' },
  { id: 'sleep', icon: 'moon-outline', titleKey: 'learn.topic.sleep', blurbKey: 'learn.topic.sleepBlurb' },
  { id: 'cognition', icon: 'bulb-outline', titleKey: 'learn.topic.cognition', blurbKey: 'learn.topic.cognitionBlurb' },
];
