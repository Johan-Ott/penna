import { errorLog } from "../errorLog.js";

export type FeedbackKind = "fel" | "ide" | "annat";

export interface Feedback {
  kind: FeedbackKind;
  message: string;
  /** For an answer; may be left empty. */
  email: string;
  hasReport: boolean;
}

/** The error report goes along only with something that is wrong, and only if the writer lets it. */
const withReport = (feedback: Feedback) => feedback.kind === "fel" && feedback.hasReport;

/** A Formspree form, or another endpoint taking the same JSON. Kept in .env.local. */
const ENDPOINT = import.meta.env.VITE_FEEDBACK_URL ?? "";

export const canSendFeedback = ENDPOINT !== "";

/** Version, device and the session's latest errors: never any of the book's text. */
export const feedbackReport = () =>
  errorLog.report({ version: __APP_VERSION__, device: navigator.userAgent });

export function feedbackText(feedback: Feedback) {
  const report = withReport(feedback) ? `\n\n---\n${feedbackReport()}` : "";
  return `${feedback.message.trim()}${report}`;
}

/** Throws when it could not be sent, so the writer can copy it instead. */
export async function sendFeedback(feedback: Feedback, send: typeof fetch) {
  const response = await send(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      kind: feedback.kind,
      message: feedback.message.trim(),
      ...(feedback.email.trim() ? { email: feedback.email.trim() } : {}),
      version: __APP_VERSION__,
      ...(withReport(feedback) ? { report: feedbackReport() } : {}),
    }),
  });
  if (!response.ok) throw new Error(`Feedback: ${response.status}`);
}
