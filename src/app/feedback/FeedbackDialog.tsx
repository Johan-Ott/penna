import { useState } from "react";
import { Choice, Dialog, DialogButtons } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import {
  canSendFeedback,
  feedbackReport,
  feedbackText,
  sendFeedback,
  type Feedback,
  type FeedbackKind,
} from "./sendFeedback.js";
import { t } from "../../i18n/i18n.js";

const KINDS: [FeedbackKind, string][] = [
  ["fel", t("Något är fel")],
  ["ide", t("En idé")],
  ["annat", t("Annat")],
];

const HINTS: Record<FeedbackKind, string> = {
  fel: t("Vad gjorde du, vad hände, och vad väntade du dig?"),
  ide: t("Vad saknar du, och vad skulle det hjälpa dig med?"),
  annat: t("Skriv det du vill säga."),
};

type Outcome = "skriver" | "skickar" | "skickad" | "kopierad";

// Without an address to send to, or when sending fails, the text goes to the clipboard instead.
function useSending(feedback: Feedback) {
  const [outcome, setOutcome] = useState<Outcome>("skriver");
  const copy = async () => {
    await navigator.clipboard.writeText(feedbackText(feedback)).catch(recordFailure("Feedback"));
    setOutcome("kopierad");
  };
  const send = async () => {
    if (!canSendFeedback) return copy();
    setOutcome("skickar");
    try {
      await sendFeedback(feedback, platform.webFetch);
      setOutcome("skickad");
    } catch {
      await copy();
    }
  };
  return { outcome, send };
}

function ReportChoice(props: { isOn: boolean; onFlip: () => void }) {
  return (
    <div className="feedback-report">
      <label className="feedback-check">
        <input type="checkbox" checked={props.isOn} onChange={props.onFlip} />
        {t("Skicka med felrapporten")}
      </label>
      <details>
        <summary>{t("Visa vad som skickas")}</summary>
        <pre>{feedbackReport()}</pre>
      </details>
    </div>
  );
}

function MessageFields(props: { feedback: Feedback; onChange: (feedback: Feedback) => void }) {
  const { feedback, onChange } = props;
  return (
    <>
      <label className="onboarding-field">
        <span className="field-label">{t("Berätta")}</span>
        <textarea
          rows={6}
          value={feedback.message}
          onChange={(event) => onChange({ ...feedback, message: event.target.value })}
        />
        <span className="setting-hint">{HINTS[feedback.kind]}</span>
      </label>
      <label className="onboarding-field">
        <span className="field-label">{t("Din e-post, om du vill ha svar")}</span>
        <input
          type="email"
          value={feedback.email}
          onChange={(event) => onChange({ ...feedback, email: event.target.value })}
        />
      </label>
    </>
  );
}

function FeedbackFields(props: { feedback: Feedback; onChange: (feedback: Feedback) => void }) {
  const { feedback, onChange } = props;
  return (
    <>
      <Choice
        label={t("Vad gäller det?")}
        value={feedback.kind}
        options={KINDS}
        onSelect={(kind) => onChange({ ...feedback, kind })}
      />
      <MessageFields feedback={feedback} onChange={onChange} />
      {feedback.kind === "fel" && (
        <ReportChoice
          isOn={feedback.hasReport}
          onFlip={() => onChange({ ...feedback, hasReport: !feedback.hasReport })}
        />
      )}
    </>
  );
}

const DONE: Partial<Record<Outcome, string>> = {
  skickad: t("Tack! Vi har fått det och läser allt."),
  kopierad: t(
    "Det gick inte att skicka härifrån. Texten är kopierad: klistra in den i ett mejl till oss.",
  ),
};

/** Feedback straight from the app: what happened, and only what the writer chooses to include. */
export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "fel",
    message: "",
    email: "",
    hasReport: true,
  });
  const { outcome, send } = useSending(feedback);
  const done = DONE[outcome];
  return (
    <Dialog label={t("Skicka feedback")} onClose={onClose}>
      {done ? <p>{done}</p> : <FeedbackFields feedback={feedback} onChange={setFeedback} />}
      {done ? (
        <div className="dialog-actions">
          <button className="button primary" onClick={onClose}>
            {t("Stäng")}
          </button>
        </div>
      ) : (
        <DialogButtons
          label={canSendFeedback ? t("Skicka") : t("Kopiera")}
          onCancel={onClose}
          onConfirm={() => void (feedback.message.trim() && outcome === "skriver" && send())}
        />
      )}
    </Dialog>
  );
}

/** The menu item and the dialog it opens. */
export function useFeedbackDialog() {
  const [isOpen, setOpen] = useState(false);
  return {
    open: () => setOpen(true),
    layer: isOpen && <FeedbackDialog onClose={() => setOpen(false)} />,
  };
}
