import { useState } from "react";
import type { ProjectDetails } from "../../project/newProject.js";
import { Dialog } from "@llkit/controls.js";
import { BookTypes, TitleAndGoal, type FieldProps } from "./BookQuestions.js";
import { BookShape } from "./BookShape.js";
import { withSuggestion } from "./books.js";
import { t } from "../../i18n/i18n.js";

// Ny bok, a question at a time in one sheet: what kind, its shape, and its title, voice and goals.

const QUESTIONS = [t("Vad skriver du?"), t("Vilken bok?"), t("Titel, röst och mål")];

type Swapping = { isSwapping: boolean; setSwapping: (isSwapping: boolean) => void };

function Question(props: FieldProps & Swapping & { step: number; libraryDir: string }) {
  if (props.step === 1) return <BookTypes {...props} />;
  if (props.step === 2) return <BookShape {...props} />;
  return <TitleAndGoal {...props} />;
}

// Only Fortsätt moves on: the choices in a step are buttons too, and pressing one only chooses.
function Steps(props: {
  step: number;
  isMaking: boolean;
  onBack: () => void;
  onForward: () => void;
  onClose: () => void;
}) {
  const isLast = props.step === QUESTIONS.length;
  return (
    <div className="dialog-actions">
      <span className="choice-hint">
        {t("Steg {step} av {steps}", { step: props.step, steps: QUESTIONS.length })}
      </span>
      <span className="spacer" />
      {/* The first step's way out is Avbryt; the others step back. */}
      <button className="button ghost" onClick={props.step > 1 ? props.onBack : props.onClose}>
        {props.step > 1 ? t("Tillbaka") : t("Avbryt")}
      </button>
      <button className="button primary" disabled={props.isMaking} onClick={props.onForward}>
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
  const [isSwapping, setSwapping] = useState(false);
  const forward = () => {
    if (isSwapping) return setSwapping(false);
    // The shape starts from what Penna suggests for the kind of book.
    if (step === 1) setDetails(withSuggestion(details));
    if (step < QUESTIONS.length) return setStep(step + 1);
    setMaking(true);
    void props.onCreate(details).finally(() => setMaking(false));
  };
  const back = () => (isSwapping ? setSwapping(false) : setStep(step - 1));
  return { step, details, setDetails, isMaking, forward, back, isSwapping, setSwapping };
}

export function NewBookDialog(props: Props) {
  const answers = useAnswers(props);
  const { step, details, setDetails, isMaking, forward, back } = answers;
  return (
    <Dialog label={QUESTIONS[step - 1] ?? ""} className="new-book-dialog" onClose={props.onClose}>
      <div
        className="new-book-form"
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target instanceof HTMLInputElement) forward();
        }}
      >
        <Question
          step={step}
          details={details}
          onChange={setDetails}
          libraryDir={props.libraryDir}
          isSwapping={answers.isSwapping}
          setSwapping={answers.setSwapping}
        />
        <Steps
          step={step}
          isMaking={isMaking}
          onBack={back}
          onForward={forward}
          onClose={props.onClose}
        />
      </div>
    </Dialog>
  );
}
