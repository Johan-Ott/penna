import type { ProjectDetails } from "../../project/newProject.js";
import {
  continueFrom,
  openExample,
  openExisting,
  type OnboardingState,
  type ProjectMode,
} from "./useOnboarding.js";

type FieldProps = { details: ProjectDetails; onChange: (details: ProjectDetails) => void };

const TYPES: [string, string][] = [
  ["roman", "Roman"],
  ["noveller", "Noveller"],
  ["fackbok", "Fackbok"],
  ["annat", "Annat"],
];

function GoalFields({ details, onChange }: FieldProps) {
  return (
    <div className="field-pair">
      <label className="onboarding-field">
        <span className="field-label">Dagligt ordmål</span>
        <input
          inputMode="numeric"
          value={details.dailyGoal.toLocaleString("sv-SE")}
          onChange={(event) =>
            onChange({ ...details, dailyGoal: Number(event.target.value.replace(/\D/g, "")) })
          }
        />
      </label>
      <label className="onboarding-field">
        <span className="field-label">Deadline (valfritt)</span>
        <input
          type="date"
          value={details.deadline}
          onChange={(event) => onChange({ ...details, deadline: event.target.value })}
        />
      </label>
    </div>
  );
}

function TypeChips({ details, onChange }: FieldProps) {
  return (
    <div className="chip-row" role="radiogroup" aria-label="Sorts bok">
      {TYPES.map(([type, label]) => (
        <button
          key={type}
          role="radio"
          className="chip"
          aria-checked={details.type === type}
          onClick={() => onChange({ ...details, type })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Enter in a field does what "Fortsätt" does, as in any form.
function NewProjectFields(props: FieldProps & { onSubmit: () => void }) {
  return (
    <div
      className="onboarding-form"
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) props.onSubmit();
      }}
    >
      <label className="onboarding-field">
        <span className="field-label">Titel</span>
        <input
          autoFocus
          placeholder="Arbetstitel duger"
          value={props.details.title}
          onChange={(event) => props.onChange({ ...props.details, title: event.target.value })}
        />
      </label>
      <GoalFields {...props} />
      <TypeChips {...props} />
    </div>
  );
}

function OpenProjectChoices({ state }: { state: OnboardingState }) {
  return (
    <div className="choice-list">
      <button className="choice" onClick={() => void openExisting(state)}>
        <span className="field-label">Öppna befintlig mapp…</span>
        <span className="choice-hint">Ett projekt du redan har</span>
      </button>
      <button className="choice" onClick={() => void openExample(state)}>
        <span className="field-label">Öppna exempelprojektet</span>
        <span className="choice-hint">Vintervägen, ett par scener att prova på</span>
      </button>
    </div>
  );
}

const MODES: [ProjectMode, string][] = [
  ["new", "Nytt projekt"],
  ["open", "Öppna befintligt"],
];

export function ProjectStep({ state, isFirst }: { state: OnboardingState; isFirst: boolean }) {
  return (
    <>
      <h1 className="onboarding-title">{isFirst ? "Ditt första projekt" : "Nytt projekt"}</h1>
      <div className="segmented fit" role="radiogroup" aria-label="Nytt eller befintligt">
        {MODES.map(([mode, label]) => (
          <button
            key={mode}
            role="radio"
            aria-checked={state.mode === mode}
            onClick={() => state.setMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      {state.mode === "new" ? (
        <NewProjectFields
          details={state.details}
          onChange={state.setDetails}
          onSubmit={() => void continueFrom(state)}
        />
      ) : (
        <OpenProjectChoices state={state} />
      )}
    </>
  );
}
