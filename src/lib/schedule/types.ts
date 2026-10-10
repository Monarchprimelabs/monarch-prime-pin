// Dose plans. Pure data, no React Native imports, so the engine runs under
// Jest in Node. Dates are local calendar days (YYYY-MM-DD) and times are
// local wall-clock HH:MM, the same convention as Injection.date/time.

export type DoseUnit = 'mcg' | 'mg' | 'IU' | 'mL';
export const DOSE_UNITS: DoseUnit[] = ['mcg', 'mg', 'IU', 'mL'];

/** 0 = Sunday … 6 = Saturday (JS getDay order). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Frequency =
  | { kind: 'daily' }
  | { kind: 'interval'; everyDays: number }              // 2 = every other day
  | { kind: 'weekdays'; days: Weekday[] }                // twice a week, specific days
  | { kind: 'onOff'; onDays: number; offDays: number };  // 5 on / 2 off

/** Optional on/off block applied on top of the frequency, e.g. 56 on, 28 off. */
export type Cycle = { onDays: number; offDays: number };

export type ProtocolRevision = {
  /** First local day this revision governs. Revisions are append-only. */
  effectiveFrom: string;
  /** Day 0 for interval, on/off and cycle counting. Kept across edits that
   *  don't change the frequency, so editing the amount never shifts the plan. */
  anchorDate: string;
  /** Entered by the user. Never defaulted (App Store guideline 1.4.2). */
  amount: string;
  unit: DoseUnit;
  frequency: Frequency;
  cycle?: Cycle;
  /** HH:MM, zero-padded, sorted. */
  times: string[];
  reminders: boolean;
};

export type Protocol = {
  id: string;
  compound: string;
  startDate: string;
  /** Last local day with planned doses. Set when the protocol is ended. */
  endDate?: string;
  vialId?: string;
  notes?: string;
  status: 'active' | 'ended';
  revisions: ProtocolRevision[];
  createdAt: string;
  updatedAt: string;
};

export type Occurrence = {
  key: string;
  protocolId: string;
  compound: string;
  date: string;
  time: string;
  amount: string;
  unit: DoseUnit;
  reminders: boolean;
};

export type DoseSkip = { occurrenceKey: string; skippedAt: string };

export type OccurrenceStatus = 'planned' | 'logged' | 'skipped' | 'notLogged';
