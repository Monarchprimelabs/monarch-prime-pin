type KBEntry = {
  keywords: string[];
  answer: string;
  refs: string[];
};

export const AI_KB: KBEntry[] = [
  {
    keywords: ['half-life', 'half life', 't1/2'],
    answer: `**Half-life** is the time it takes for a compound's plasma concentration to drop by 50%.\n\nFor research peptides, this determines how often dosing is studied:\n• **Short half-life** (Sermorelin ~12 min, BPC-157 ~4 hr) — frequent dosing in studies\n• **Medium half-life** (Tesamorelin ~30 min, GHRPs ~2 hr) — daily dosing common\n• **Long half-life** (Semaglutide ~7 days, Retatrutide ~6 days) — weekly dosing\n\nGenerally, steady-state concentrations are reached after ~5 half-lives.`,
    refs: ['Pharmacology textbooks', 'PubChem'],
  },
  {
    keywords: ['titration', 'titrate', 'ramp up', 'escalation'],
    answer: `**Titration** is the gradual escalation of a compound to a target concentration, used in research to assess tolerance and minimize adverse effects.\n\nGLP-1 / GIP / glucagon agonist studies typically follow a phased model:\n• **Phase 1 — Initiation:** lowest dose, weeks 1–4\n• **Phase 2 — Escalation:** double the initiation, weeks 5–8\n• **Phase 3 — Maintenance:** target therapeutic concentration\n• **Phase 4 — Optimization:** further escalation if tolerated\n\nThis pattern is documented in published trials for compounds like semaglutide, tirzepatide, and retatrutide.\n\n_For specific dose recommendations applicable to your situation, consult a qualified medical professional._`,
    refs: ['NEJM trials', 'Eli Lilly clinical data'],
  },
  {
    keywords: ['mixing', 'reconstitut', 'bac water', 'bacteriostatic'],
    answer: `**Reconstitution** is the process of dissolving a lyophilized peptide in a sterile diluent for laboratory use.\n\n**General principles documented in protein-handling literature:**\n• Bacteriostatic water (0.9% benzyl alcohol) is standard for peptides intended for repeated multi-week sampling\n• Add diluent slowly down the side of the vial — do not direct stream onto the powder\n• Do not shake; gently swirl until dissolved\n• Most reconstituted peptides are stable refrigerated (2–8°C) for 14–30 days\n\n**Concentration math:**\nConcentration (mg/mL) = peptide mg ÷ diluent mL\n\nUse the **Calculator** in Settings to compute draw volume and IU equivalents.`,
    refs: ['Sigma-Aldrich peptide handling guide'],
  },
  {
    keywords: ['site rotation', 'rotate', 'rotation', 'injection site'],
    answer: `**Site rotation** in subcutaneous administration research is used to:\n• Reduce risk of localized irritation, lipohypertrophy, or scarring at any single site\n• Allow tissue recovery between exposures\n\n**Typical rotation patterns in published protocols:**\n• Abdomen quadrants (avoiding 2 inches around the umbilicus)\n• Outer thighs\n• Posterior upper arms\n• Flanks\n\nResearchers commonly avoid using the same exact site within 7–14 days. Your **Site Heatmap** on the Home tab visualizes recent usage density automatically.`,
    refs: ['ADA injection technique guidelines'],
  },
  {
    keywords: ['side effect', 'nausea', 'glp-1', 'gi', 'gastrointestinal'],
    answer: `**Documented adverse effects in GLP-1 / GIP / glucagon receptor agonist trials:**\n\n**Most common (>10% in trials):**\n• Nausea (dose-dependent, usually transient first 2–4 weeks)\n• Decreased appetite\n• Constipation or diarrhea\n• Injection site reactions\n\n**Less common:**\n• Fatigue, headache, dizziness\n• Heartburn / GERD\n• Mild hair shedding (usually with rapid weight loss)\n\n**Reported in trials but rare:**\n• Pancreatitis, gallbladder disease, severe GI distress\n\nResearchers in published trials typically slow titration if moderate-severe effects appear.\n\n_Severe symptoms warrant immediate medical evaluation._`,
    refs: ['SURMOUNT-1 trial', 'STEP trials'],
  },
  {
    keywords: ['storage', 'refrigerat', 'freeze', 'stability'],
    answer: `**Peptide stability — published handling guidance:**\n\n**Lyophilized (powder) form:**\n• Long-term: −20°C, protected from light\n• Short-term (weeks): 2–8°C acceptable for most peptides\n\n**Reconstituted:**\n• 2–8°C refrigerated, away from light\n• Stability ranges 14–30+ days depending on peptide and diluent\n• Avoid freeze/thaw cycles after reconstitution\n\n**Signs of degradation:**\n• Cloudy solution where it should be clear\n• Color change\n• Visible particulate\n\nStore in the original vial, upright, with the label intact.`,
    refs: ['Bachem peptide storage handbook'],
  },
  {
    keywords: ['glp-1', 'glp1', 'how does', 'mechanism'],
    answer: `**GLP-1 receptor agonists** mimic the action of an endogenous incretin hormone.\n\n**Mechanisms documented in literature:**\n• Stimulate glucose-dependent insulin secretion\n• Suppress glucagon when glucose is elevated\n• Slow gastric emptying\n• Act on hypothalamic appetite centers — reducing food intake\n\n**Dual / triple agonists:**\n• **Tirzepatide** = GLP-1 + GIP\n• **Retatrutide** = GLP-1 + GIP + glucagon\n\nThe additional glucagon action in retatrutide is hypothesized to increase resting energy expenditure.`,
    refs: ['Frias et al. 2021', 'Jastreboff et al. 2023'],
  },
  {
    keywords: ['bpc', 'bpc-157', 'healing'],
    answer: `**BPC-157** is a 15-amino-acid synthetic peptide derived from a sequence of human gastric juice protein BPC.\n\n**Research findings (predominantly animal models):**\n• Tendon-to-bone and ligament healing acceleration\n• Anti-inflammatory effects in GI tissue models\n• Angiogenic effects at injury sites\n• Neuroprotective effects in some rodent studies\n\n**Important context:**\n• Most data is preclinical (rat / mouse)\n• Limited human clinical trial data\n• Not approved by FDA, EMA, or any major regulatory agency\n• WADA-banned as of 2022 for athletes\n\nCommonly stacked in research with TB-500 due to complementary tissue-repair mechanisms in animal studies.`,
    refs: ['Sikiric et al. multiple papers'],
  },
];

const REFUSE_PATTERNS = [
  /how much should i/i,
  /what dose should i/i,
  /should i increase/i,
  /should i decrease/i,
  /is .* mg safe for me/i,
  /can i take/i,
  /should i start at/i,
];

export type AIResponse = { answer: string; refs: string[]; isRefusal?: boolean };

export function aiAnswer(question: string): AIResponse {
  if (REFUSE_PATTERNS.some(p => p.test(question))) {
    return {
      answer: `I can't recommend personal dosing — that requires a qualified medical professional who knows your full health context.\n\nWhat I **can** do:\n• Explain how a compound works mechanistically\n• Describe titration patterns documented in published research\n• Walk through reconstitution and storage principles\n• Explain side effect profiles from clinical trials\n\nTry asking _"How does titration work in GLP-1 studies?"_ or _"What's the half-life of Retatrutide?"_\n\n_Personalized dose coaching will be available in **Prime AI+** (coming soon)._`,
      refs: [],
      isRefusal: true,
    };
  }

  const q = question.toLowerCase();
  const match = AI_KB.find(item => item.keywords.some(k => q.includes(k.toLowerCase())));

  if (match) {
    return { answer: match.answer, refs: match.refs };
  }

  return {
    answer: `I don't have specific information on that yet in educational mode.\n\nMy current knowledge covers:\n• **Pharmacology basics** — half-life, mechanisms, receptor classes\n• **Titration patterns** documented in trials\n• **Reconstitution and storage** principles\n• **Site rotation** practices\n• **Side effect profiles** from published research\n\nTry rephrasing, or ask about one of those topics.\n\n_Deeper Q&A coming in **Prime AI+**._`,
    refs: [],
  };
}
