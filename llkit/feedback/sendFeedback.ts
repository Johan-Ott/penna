import { appInfo } from "../appInfo.js";
import { errorLog } from "../errorLog.js";
import { t } from "../i18n.js";

export type FeedbackKind = "fel" | "ide" | "annat";

export interface Feedback {
  kind: FeedbackKind;
  message: string;
  hasReport: boolean;
}

/** The error report goes along only with something that is wrong, and only if the writer lets it. */
const withReport = (feedback: Feedback) => feedback.kind === "fel" && feedback.hasReport;

// Feedback is an email the writer sends from their own mail program, so no one else handles it.
let address = "";

/** Where the app's feedback mail goes; until it is handed in, feedback can only be copied. */
export function provideFeedbackAddress(to: string) {
  address = to;
}

export const canSendFeedback = () => address !== "";

/** Version, device and the session's latest errors: never any of the book's text. */
export function feedbackReport() {
  const { name, version } = appInfo();
  return errorLog.report({ app: name, version, device: navigator.userAgent });
}

export function feedbackText(feedback: Feedback) {
  const report = withReport(feedback) ? `\n\n---\n${feedbackReport()}` : "";
  return `${feedback.message.trim()}${report}`;
}

const SUBJECTS: Record<FeedbackKind, string> = { fel: "Fel", ide: "Idé", annat: "Feedback" };

// Some mail programs cut a longer mailto link; the report is then pasted from the clipboard.
const LONGEST_LINK = 1800;

/** The mail to open, with the message and, when it fits, the report. */
export function feedbackMail(feedback: Feedback) {
  const { name, version } = appInfo();
  const link = (body: string) =>
    `mailto:${address}?subject=${encodeURIComponent(`${name} ${version}: ${SUBJECTS[feedback.kind]}`)}&body=${encodeURIComponent(body)}`;
  const full = link(feedbackText(feedback));
  if (full.length <= LONGEST_LINK) return full;
  return link(
    `${feedback.message.trim()}\n\n---\n${t("Felrapporten är kopierad: klistra in den här.")}`,
  );
}
