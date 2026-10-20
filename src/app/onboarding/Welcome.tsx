import { useState } from "react";
import logo from "../../assets/skrivro-logo.png";
import { platform } from "../platform.js";
import { useRootClass } from "@llkit/useRootClass.js";
import type { Theme } from "../../editor/writingSettings.js";
import { UiLanguageChoice } from "../settings/UiLanguageChoice.js";
import { FirstChoices, type Choices } from "./FirstChoices.js";
import { WindowBar } from "@llkit/shell/WindowControls.js";
import { t } from "../../i18n/i18n.js";
import { recordFailure } from "@llkit/errorLog.js";

// The first start, the same on a computer and a phone: Skrivro's language at the top, signed in
// with Google so the books follow, or not, and then the few choices that make Skrivro one's own.

type Start = (withGoogle: boolean) => void;

function WayIn(props: { onStart: Start; canSignIn: boolean; isSigningIn: boolean }) {
  const { onStart, canSignIn, isSigningIn } = props;
  if (!canSignIn)
    return (
      <button className="button primary large" onClick={() => onStart(false)}>
        {t("Kom igång")}
      </button>
    );
  return (
    <>
      <button
        className="button primary large"
        disabled={isSigningIn}
        aria-busy={isSigningIn}
        onClick={() => onStart(true)}
      >
        {isSigningIn ? t("Loggar in…") : t("Logga in med Google")}
      </button>
      <button className="link-button" disabled={isSigningIn} onClick={() => onStart(false)}>
        {t("Börja utan konto")}
      </button>
    </>
  );
}

type WelcomeProps = {
  onStart: (choices: Choices) => Promise<void>;
  /** Signs in; true when the writer's account from another device was found and taken. */
  onSignIn: () => Promise<boolean>;
  theme: Theme;
  onTheme: (theme: Theme) => void;
};

const Problem = ({ text }: { text: string | null }) =>
  text ? (
    <p className="onboarding-problem" role="alert">
      {text}
    </p>
  ) : null;

// The way in: Skrivro's language, what Skrivro is, and signed in or not.
function Greeting(props: {
  onWay: (withGoogle: boolean) => void;
  problem: string | null;
  isSigningIn: boolean;
}) {
  const canSignIn = platform.googleSignIn !== undefined;
  return (
    <main className="welcome" data-tauri-drag-region>
      <WindowBar />
      <div className="welcome-language">
        <UiLanguageChoice />
      </div>
      <Problem text={props.problem} />
      <img className="brand-mark large" src={logo} alt="" />
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="welcome-text">
        {canSignIn
          ? t("Logga in med Google så följer dina böcker med mellan dina enheter.")
          : t("Böckerna sparas som vanliga filer på den här enheten. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      <WayIn onStart={props.onWay} canSignIn={canSignIn} isSigningIn={props.isSigningIn} />
      <p className="welcome-promise">{t("Dina texter är dina. Aldrig AI-träning.")}</p>
    </main>
  );
}

// Signed in on another device already, the writer has made their choices there.
export function Welcome(props: WelcomeProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [isChoosing, setChoosing] = useState(false);
  const [isSigningIn, setSigningIn] = useState(false);
  useRootClass("welcome-shown");
  const onWay = (withGoogle: boolean) => {
    setProblem(null);
    if (!withGoogle) return setChoosing(true);
    setSigningIn(true);
    void props
      .onSignIn()
      .then((hasAccount) => setChoosing(!hasAccount))
      .catch(() => setProblem(t("Inloggningen blev inte klar. Försök igen.")))
      .finally(() => setSigningIn(false));
  };
  if (!isChoosing) return <Greeting onWay={onWay} problem={problem} isSigningIn={isSigningIn} />;
  return (
    <main className="welcome" data-tauri-drag-region>
      <WindowBar />
      <FirstChoices
        theme={props.theme}
        onTheme={props.onTheme}
        onDone={(choices) => void props.onStart(choices).catch(recordFailure("Första starten"))}
        onBack={() => setChoosing(false)}
      />
    </main>
  );
}
