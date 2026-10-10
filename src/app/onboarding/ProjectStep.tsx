import { useState, type DragEvent, type ReactNode } from "react";
import { MANUSCRIPT_FILES } from "../../import/importManuscript.js";
import { BookQuestion } from "./BookQuestions.js";
import { platform } from "../platform.js";
import {
  importFile,
  openExample,
  openExisting,
  type OnboardingState,
  type ProjectMode,
} from "./useOnboarding.js";
import { t } from "../../i18n/i18n.js";

function OpenProjectChoices({ state }: { state: OnboardingState }) {
  return (
    <div className="choice-list">
      <button className="choice" onClick={() => void openExisting(state)}>
        <span className="field-label">{t("Öppna befintlig mapp…")}</span>
        <span className="choice-hint">{t("Ett projekt du redan har")}</span>
      </button>
      <button className="choice" onClick={() => void openExample(state)}>
        <span className="field-label">{t("Öppna exempelprojektet")}</span>
        <span className="choice-hint">{t("Vintervägen, ett par scener att prova på")}</span>
      </button>
    </div>
  );
}

// A dropped file has no path in the web view, so it is read from its bytes.
async function dropFile(state: OnboardingState, event: DragEvent) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];
  if (file)
    await importFile(state, { path: file.name, bytes: new Uint8Array(await file.arrayBuffer()) });
}

async function pickFile(state: OnboardingState) {
  const picked = await platform.pickFile(MANUSCRIPT_FILES);
  if (picked) await importFile(state, picked);
}

function ImportChoices({ state }: { state: OnboardingState }) {
  const [isOver, setOver] = useState(false);
  return (
    <>
      <div
        className={isOver ? "drop-zone over" : "drop-zone"}
        onDragOver={(event) => (event.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => (setOver(false), void dropFile(state, event))}
      >
        <span className="field-label">{t("Släpp ditt manus här")}</span>
        <span className="choice-hint">
          {t("Word (.docx), Scrivener (.scriv), Markdown eller text.")}
          <br />
          {t("Kapitel delas upp vid rubrikerna.")}
        </span>
        <button className="button secondary" onClick={() => void pickFile(state)}>
          {t("Välj fil…")}
        </button>
      </div>
      <button className="link-button quiet" onClick={() => void openExample(state)}>
        {t("Eller öppna exempelprojektet")}
      </button>
    </>
  );
}

const CHOICES: Record<ProjectMode, (state: OnboardingState) => ReactNode> = {
  new: (state) => <BookQuestion state={state} />,
  import: (state) => <ImportChoices state={state} />,
  open: (state) => <OpenProjectChoices state={state} />,
};

const MODES: [ProjectMode, string][] = [
  ["new", t("Nytt projekt")],
  ["import", t("Importera")],
  ["open", t("Öppna befintligt")],
];

export function ProjectStep({ state, isFirst }: { state: OnboardingState; isFirst: boolean }) {
  if (state.mode === "new" && state.bookStep > 1) return <BookQuestion state={state} />;
  return (
    <>
      <h1 className="onboarding-title">{isFirst ? t("Ditt första projekt") : t("Nytt projekt")}</h1>
      <div className="segmented fit" role="radiogroup" aria-label={t("Nytt eller befintligt")}>
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
      {CHOICES[state.mode](state)}
    </>
  );
}
