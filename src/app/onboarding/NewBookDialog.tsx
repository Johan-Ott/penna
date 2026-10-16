import { useState } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { suggestedStructure } from "../../project/templates.js";
import { Dialog } from "../controls.js";
import { TemplateSuggestion } from "../templates/TemplateChoices.js";
import { BookTypes, StoryPieces, TitleAndGoal, type FieldProps } from "./BookQuestions.js";
import { t } from "../../i18n/i18n.js";

// Ny bok, a question at a time in one sheet: what kind, which pieces and how it is told,
// Penna's suggestion for its parts and chapters, and its title and goal.

const QUESTIONS = [
  t("Vad skriver du?"),
  t("Vad för sorts berättelse?"),
  t("Vårt förslag"),
  t("Titel och mål"),
];

// A fackbok has no story, so it goes past the pieces; the suggestion follows what was chosen.
function nextStep(step: number, details: ProjectDetails) {
  const next = step === 1 && details.type === "fackbok" ? 3 : step + 1;
  const pieces = next === 3 && details.type === "fackbok" ? [] : details.pieces;
  const suggested = { ...details, pieces, structure: suggestedStructure(details.type, pieces) };
  return { next, details: next === 3 ? suggested : details };
}

function Question(props: FieldProps & { step: number; libraryDir: string }) {
  if (props.step === 1) return <BookTypes {...props} />;
  if (props.step === 2) return <StoryPieces {...props} />;
  if (props.step === 3) return <TemplateSuggestion {...props} libraryDir={props.libraryDir} />;
  return <TitleAndGoal {...props} />;
}

function Steps(props: { step: number; isMaking: boolean; onBack: () => void }) {
  const isLast = props.step === QUESTIONS.length;
  return (
    <div className="dialog-actions">
      <span className="choice-hint">
        {t("Steg {step} av {steps}", { step: props.step, steps: QUESTIONS.length })}
      </span>
      <span className="spacer" />
      {props.step > 1 && (
        <button type="button" className="button ghost" onClick={props.onBack}>
          {t("Tillbaka")}
        </button>
      )}
      <button type="submit" className="button primary" disabled={props.isMaking}>
        {isLast ? t("Skapa boken") : t("Fortsätt")}
      </button>
    </div>
  );
}

type Props = {
  start: ProjectDetails;
  libraryDir: string;
  onCreate: (details: ProjectDetails) => Promise<void>;
  onClose: () => void;
};

function useAnswers(props: Props) {
  const [step, setStep] = useState(1);
  const [details, setDetails] = useState(props.start);
  const [isMaking, setMaking] = useState(false);
  const forward = () => {
    if (step < QUESTIONS.length) {
      const moved = nextStep(step, details);
      return (setDetails(moved.details), setStep(moved.next));
    }
    setMaking(true);
    void props.onCreate(details).finally(() => setMaking(false));
  };
  const back = () => setStep(step === 3 && details.type === "fackbok" ? 1 : step - 1);
  return { step, details, setDetails, isMaking, forward, back };
}

export function NewBookDialog(props: Props) {
  const { step, details, setDetails, isMaking, forward, back } = useAnswers(props);
  return (
    <Dialog label={QUESTIONS[step - 1] ?? ""} className="new-book-dialog" onClose={props.onClose}>
      <form onSubmit={(event) => (event.preventDefault(), forward())}>
        <Question
          step={step}
          details={details}
          onChange={setDetails}
          libraryDir={props.libraryDir}
        />
        <Steps step={step} isMaking={isMaking} onBack={back} />
      </form>
    </Dialog>
  );
}
