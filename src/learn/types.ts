// Learn library (web app only): what published research says about common
// compounds. Educational reference, never recommendations or dosing.

export type Source = { title: string; journal?: string; publisher?: string; year?: number; url: string };

export type EvidenceLevel =
  | 'Approved drug (human RCTs)'
  | 'Human clinical trials (limited)'
  | 'Mostly animal studies'
  | 'In vitro / very early';

/** A status line; `more` lists further sources backing the same statement. */
export type Status = { text: string; source: Source; more?: Source[] };

export type Finding = { text: string; subjects: string; design: string; source: Source };

export type LearnCompound = {
  id: string;
  name: string;
  aliases: string[];
  category: string;
  summary: string;
  evidenceLevel: EvidenceLevel;
  fdaStatus: Status;
  wadaStatus: Status | null;
  topics: string[];
  findings: Finding[];
  risks: { text: string; source: Source }[];
  unknowns: string[];
};

/** Strongest first; used for the evidence meter and sorting. */
export const EVIDENCE_ORDER: EvidenceLevel[] = [
  'Approved drug (human RCTs)',
  'Human clinical trials (limited)',
  'Mostly animal studies',
  'In vitro / very early',
];
