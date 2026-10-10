import type { ProjectDetails } from "../../project/newProject.js";
import { NarrationPicker } from "../review/NarrationPicker.js";
import { PieceToggles, TemplateSuggestion } from "../templates/TemplateChoices.js";
import { BOOK_STEPS, continueFrom, type OnboardingState } from "./useOnboarding.js";
import { t, numberLocale } from "../../i18n/i18n.js";

type FieldProps = { details: ProjectDetails; onChange: (details: ProjectDetails) => void };

const TYPES: [string, string, string][] = [
  ["roman", t("Roman"), t("En lång berättelse")],
  ["noveller", t("Noveller"), t("En eller flera korta berättelser")],
  ["fackbok", t("Fackbok"), t("Kunskap, minnen eller en idé")],
  ["annat", t("Annat"), t("Något eget, du bygger det själv")],
];

function GoalFields({ details, onChange }: FieldProps) {
  return (
    <div className="field-pair">
      <label className="onboarding-field">
        <span className="field-label">{t("Dagligt ordmål")}</span>
        <input
          inputMode="numeric"
          value={details.dailyGoal.toLocaleString(numberLocale())}
          onChange={(event) =>
            onChange({ ...details, dailyGoal: Number(event.target.value.replace(/\D/g, "")) })
          }
        />
      </label>
      <label className="onboarding-field">
        <span className="field-label">{t("Deadline (valfritt)")}</span>
        <input
          type="date"
          value={details.deadline}
          onChange={(event) => onChange({ ...details, deadline: event.target.value })}
        />
      </label>
    </div>
  );
}

function BookTypes({ details, onChange }: FieldProps) {
  return (
    <div className="template-list" role="radiogroup" aria-label={t("Vad skriver du?")}>
      {TYPES.map(([type, label, hint]) => (
        <button
          key={type}
          role="radio"
          className="template-choice"
          aria-checked={details.type === type}
          onClick={() => onChange({ ...details, type })}
        >
          <span className="template-name">{label}</span>
          <span className="choice-hint">{hint}</span>
        </button>
      ))}
    </div>
  );
}

function StoryPieces({ details, onChange }: FieldProps) {
  return (
    <>
      <p className="onboarding-text">
        {t("Välj så många som passar, eller inga alls. Du kan lägga till fler senare.")}
      </p>
      <PieceToggles
        chosen={details.pieces}
        onChange={(pieces) => onChange({ ...details, pieces })}
      />
      <span className="field-label">{t("Hur berättas den?")}</span>
      <NarrationPicker
        value={details.narration}
        onChange={(narration) => onChange({ ...details, narration })}
      />
      <span className="setting-hint">
        {t("Granska håller koll på att texten följer det, till exempel filterord i deep POV.")}
      </span>
    </>
  );
}

function TitleAndGoal(props: FieldProps & { onSubmit: () => void }) {
  return (
    <div
      className="onboarding-form"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) props.onSubmit();
      }}
    >
      <label className="onboarding-field">
        <span className="field-label">{t("Titel")}</span>
        <input
          autoFocus
          placeholder={t("Arbetstitel duger")}
          value={props.details.title}
          onChange={(event) => props.onChange({ ...props.details, title: event.target.value })}
        />
      </label>
      <GoalFields {...props} />
    </div>
  );
}

const QUESTIONS = [
  t("Vad skriver du?"),
  t("Vad för sorts berättelse?"),
  t("Vårt förslag"),
  t("Titel och mål"),
];

// One question at a time. The first shares its screen, and its heading, with the choice of new
// or existing, so its question is a label instead.
export function BookQuestion({ state }: { state: OnboardingState }) {
  const props = { details: state.details, onChange: state.setDetails };
  const { bookStep } = state;
  const question = QUESTIONS[bookStep - 1];
  return (
    <>
      <span className="choice-hint">
        {t("Steg {step} av {steps}", { step: bookStep, steps: BOOK_STEPS })}
      </span>
      {bookStep === 1 ? (
        <span className="field-label">{question}</span>
      ) : (
        <h1 className="onboarding-title">{question}</h1>
      )}
      {bookStep === 1 && <BookTypes {...props} />}
      {bookStep === 2 && <StoryPieces {...props} />}
      {bookStep === 3 && <TemplateSuggestion {...props} libraryDir={state.libraryDir} />}
      {bookStep === 4 && <TitleAndGoal {...props} onSubmit={() => void continueFrom(state)} />}
    </>
  );
}
