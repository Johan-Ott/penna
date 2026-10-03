import type { OnboardingState } from "./useOnboarding.js";

const PROMISES = [
  ["Ingen AI-träning", "Dina texter används aldrig för att träna AI och säljs aldrig vidare."],
  [
    "Dina filer, din mapp",
    "Manuset sparas som vanliga filer i en mapp du väljer. Vi har inga servrar för dina texter.",
  ],
  ["Ingen prenumeration", "Du köper appen. Inga konton, inga månadsavgifter."],
  ["Alltid exporterbart", "Ta med allt när du vill: DOCX, EPUB, PDF och Markdown."],
];

const TIPS = [
  ["Hitta allt", "Scener, kapitel och kommandon.", "Ctrl K"],
  ["Fokusläge", "Bara texten, raden mitt på skärmen.", "Ctrl Shift F"],
  ["Stilar", "Märk upp brev och citat, formge i Bokdesign senare.", "Brödtext ▾"],
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
      <h1 className="onboarding-title large">Välkommen till Penna.</h1>
      <p className="onboarding-text">
        En lugn plats att skriva böcker. Det tar en minut att komma igång.
      </p>
      <div className="onboarding-field">
        <span className="field-label">Språk</span>
        <div className="segmented fit" role="radiogroup" aria-label="Språk">
          <button role="radio" aria-checked="true">
            Svenska
          </button>
          <button role="radio" aria-checked="false" disabled title="Engelska kommer snart">
            English · kommer snart
          </button>
        </div>
      </div>
    </>
  );
}

export function PromisesStep() {
  return (
    <>
      <h1 className="onboarding-title">Din text är din.</h1>
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

export function FolderStep({ state }: { state: OnboardingState }) {
  return (
    <>
      <h1 className="onboarding-title">Var ska dina texter bo?</h1>
      <p className="onboarding-text">
        Välj en mapp i din molntjänst om du vill skriva på flera enheter.
      </p>
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
          <span className="field-label">Annan mapp…</span>
          <span className="choice-hint">Till exempel Google Drive</span>
        </button>
      </div>
      {state.libraryDir && (
        <span className="choice-hint">Mapp: {state.libraryDir} · kan ändras senare</span>
      )}
    </>
  );
}

export function DoneStep() {
  return (
    <>
      <h1 className="onboarding-title">Allt klart.</h1>
      <p className="onboarding-text">Tre saker som är bra att kunna från start.</p>
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
