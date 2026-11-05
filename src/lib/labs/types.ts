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

/** One page of a saved report: a photo or a PDF kept in Documents/lab-reports. */
export type LabReportFile = {
  /** "mpp-labfile:<name>" (see reportFiles.native.ts). */
  ref: string;
  kind: 'image' | 'pdf';
  /** Image size in pixels, for laying the page out at its own shape. */
  width?: number;
  height?: number;
};

/**
 * The user's own lab report, saved as they received it (photos or a PDF).
 * The app only stores and shows it; it never reads or interprets the contents.
 */
export type LabReport = {
  id: string;
  /** Local day of the draw, YYYY-MM-DD. */
  date: string;
  /** Free text, e.g. "Quest hormone panel". */
  label: string;
  files: LabReportFile[];
  notes?: string;
  createdAt: string;
};
