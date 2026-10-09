/** Where the manuscript has been sent, kept in project.json under `submissions`. */
export type SubmissionStatus = "skickat" | "mer" | "nej" | "ja";

export interface Submission {
  id: string;
  /** The publisher or agent. */
  to: string;
  /** YYYY-MM-DD. */
  sent: string;
  status: SubmissionStatus;
  note: string;
}

const STATUSES: SubmissionStatus[] = ["skickat", "mer", "nej", "ja"];

const isSubmission = (value: unknown): value is Submission => {
  const row = value as Partial<Submission> | null;
  return (
    typeof row?.id === "string" &&
    typeof row.to === "string" &&
    typeof row.sent === "string" &&
    STATUSES.includes(row.status as SubmissionStatus) &&
    typeof row.note === "string"
  );
};

export function submissionsOf(fields: Record<string, unknown>): Submission[] {
  const stored = fields["submissions"];
  return Array.isArray(stored) ? stored.filter(isSubmission) : [];
}

export const withSubmission = (rows: Submission[], id: string, change: Partial<Submission>) =>
  rows.map((row) => (row.id === id ? { ...row, ...change } : row));
