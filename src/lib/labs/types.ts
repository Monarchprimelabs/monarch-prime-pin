/** One lab value the user typed in from their own lab report. */
export type LabResult = {
  id: string;
  /** Local day of the draw, YYYY-MM-DD. */
  date: string;
  /** Free text, e.g. "Hormone panel". */
  panelName: string;
  /** Free text; suggestions come from a list of marker names only. */
  markerName: string;
  value: number;
  /** Free text, as printed on the report. */
  unit: string;
  /** The reference range printed on the user's own report, if they enter it. */
  refLow?: number | null;
  refHigh?: number | null;
  notes?: string;
  createdAt: string;
};
