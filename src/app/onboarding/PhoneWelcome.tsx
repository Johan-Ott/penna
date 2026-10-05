import { continueFrom, openExample, type OnboardingState } from "./useOnboarding.js";
import { t } from "../../i18n/i18n.js";

/**
 * The first start on a phone, as the mobile design draws it. The books live in Penna's own
 * folder on the phone; "Skapa ny mapp" makes it and goes on to the first project.
 */
export function PhoneWelcome({ state }: { state: OnboardingState }) {
  const start = () => void continueFrom({ ...state, step: 3 });
  return (
    <main className="phone-welcome">
      <span className="brand-mark large" aria-hidden="true">
        P
      </span>
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="phone-welcome-text">
        {t("Böckerna sparas i Pennas egen mapp på telefonen. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      {state.problem && (
        <p className="onboarding-problem" role="alert">
          {state.problem}
        </p>
      )}
      <button className="button primary large" onClick={start} disabled={!state.libraryDir}>
        {t("Skapa ny mapp")}
      </button>
      <button className="link-button" onClick={() => void openExample(state)}>
        {t("Prova exempelprojektet")}
      </button>
      <p className="phone-welcome-promise">
        {t("Dina texter används aldrig för AI-träning och lämnar aldrig din telefon.")}
      </p>
    </main>
  );
}
