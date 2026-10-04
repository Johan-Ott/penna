import type { OnboardingState } from "./useOnboarding.js";
import { t } from "../../i18n/i18n.js";
import { UiLanguageChoice } from "../settings/UiLanguageChoice.js";

const PROMISES = [
  [
    t("Ingen AI-träning"),
    t("Dina texter används aldrig för att träna AI och säljs aldrig vidare."),
  ],
  [
    t("Dina filer, din mapp"),
    t("Manuset sparas som vanliga filer i en mapp du väljer. Vi har inga servrar för dina texter."),
  ],
  [t("Ingen prenumeration"), t("Du köper appen. Inga konton, inga månadsavgifter.")],
  [t("Alltid exporterbart"), t("Ta med allt när du vill: DOCX, EPUB, PDF och Markdown.")],
];

const TIPS = [
  [t("Hitta allt"), t("Scener, kapitel och kommandon."), "Ctrl K"],
  [t("Fokusläge"), t("Bara texten, raden mitt på skärmen."), "Ctrl Shift F"],
  [t("Stilar"), t("Märk upp brev och citat, formge i Bokdesign senare."), t("Brödtext") + " ▾"],
];

function CheckMark() {
  return (
    <span className="promise-mark" aria-hidden="true">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  );
}

export function WelcomeStep() {
  return (
    <>
      <h1 className="onboarding-title large">{t("Välkommen till Penna.")}</h1>
      <p className="onboarding-text">
        {t("En lugn plats att skriva böcker. Det tar en minut att komma igång.")}
      </p>
      <div className="onboarding-field">
        <span className="field-label">{t("Språk")}</span>
        <UiLanguageChoice />
      </div>
    </>
  );
}

export function PromisesStep() {
  return (
    <>
      <h1 className="onboarding-title">{t("Din text är din.")}</h1>
      {PROMISES.map(([title, text]) => (
        <div className="promise" key={title}>
          <CheckMark />
          <span className="promise-text">
            <span className="field-label">{title}</span>
            <span className="onboarding-text">{text}</span>
          </span>
        </div>
      ))}
    </>
  );
}

function LibraryChoices({ state }: { state: OnboardingState }) {
  return (
    <div className="choice-list">
      {state.libraries.map((library) => (
        <button
          key={library.id}
          className="choice"
          aria-pressed={state.libraryDir === library.path}
          onClick={() => state.setLibraryDir(library.path)}
        >
          <span className="field-label">{library.label}</span>
          <span className="choice-hint">{library.hint}</span>
        </button>
      ))}
      <button className="choice" onClick={() => void state.chooseOther()}>
        <span className="field-label">{t("Annan mapp…")}</span>
        <span className="choice-hint">{t("Till exempel Google Drive")}</span>
      </button>
    </div>
  );
}

export function FolderStep({ state }: { state: OnboardingState }) {
  return (
    <>
      <h1 className="onboarding-title">{t("Var ska dina texter bo?")}</h1>
      <p className="onboarding-text">
        {t("Välj en mapp i din molntjänst om du vill skriva på flera enheter.")}
      </p>
      <LibraryChoices state={state} />
      {state.libraryDir && (
        <span className="choice-hint">
          {t("Mapp: {folder} · kan ändras senare", { folder: state.libraryDir ?? "" })}
        </span>
      )}
    </>
  );
}

export function DoneStep() {
  return (
    <>
      <h1 className="onboarding-title">{t("Allt klart.")}</h1>
      <p className="onboarding-text">{t("Tre saker som är bra att kunna från start.")}</p>
      {TIPS.map(([title, text, keys]) => (
        <div className="tip" key={title}>
          <span className="promise-text">
            <span className="field-label">{title}</span>
            <span className="choice-hint">{text}</span>
          </span>
          <kbd className="tip-keys">{keys}</kbd>
        </div>
      ))}
    </>
  );
}
