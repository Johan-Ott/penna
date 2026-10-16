import logo from "../../assets/penna-logo.png";
import { platform } from "../platform.js";
import { continueFrom, signInFirst, type OnboardingState } from "./useOnboarding.js";
import { t } from "../../i18n/i18n.js";

type Props = { state: OnboardingState; onSignIn: (libraryDir: string) => Promise<void> };

const canSignIn = () => platform.googleSignIn !== undefined;

// Two ways in: signed in with Google, books and all following, or on this phone alone.
function WayIn({ state, onSignIn }: Props) {
  const start = () => void continueFrom({ ...state, step: 3 });
  if (!canSignIn())
    return (
      <button className="button primary large" onClick={start} disabled={!state.libraryDir}>
        {t("Kom igång")}
      </button>
    );
  return (
    <>
      <button
        className="button primary large"
        disabled={!state.libraryDir}
        onClick={() => void signInFirst(state, onSignIn)}
      >
        {t("Logga in med Google")}
      </button>
      <button className="link-button" onClick={start} disabled={!state.libraryDir}>
        {t("Fortsätt utan att logga in")}
      </button>
    </>
  );
}

export function PhoneWelcome(props: Props) {
  return (
    <main className="phone-welcome">
      <img className="brand-mark large" src={logo} alt="" />
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="phone-welcome-text">
        {canSignIn()
          ? t("Logga in med Google så följer dina böcker med mellan telefonen och datorn.")
          : t("Böckerna sparas i Pennas egen mapp på telefonen. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      {props.state.problem && (
        <p className="onboarding-problem" role="alert">
          {props.state.problem}
        </p>
      )}
      <WayIn {...props} />
      <p className="phone-welcome-promise">{t("Dina texter används aldrig för AI-träning.")}</p>
    </main>
  );
}
