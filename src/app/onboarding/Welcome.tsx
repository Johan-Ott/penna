import { useState } from "react";
import logo from "../../assets/penna-logo.png";
import { platform } from "../platform.js";
import { useRootClass } from "@llkit/useRootClass.js";
import type { Theme } from "../../editor/writingSettings.js";
import { UiLanguageChoice } from "../settings/UiLanguageChoice.js";
import { FirstChoices, type Choices } from "./FirstChoices.js";
import { WindowBar } from "@llkit/shell/WindowControls.js";
import { t } from "../../i18n/i18n.js";

// The first start, the same on a computer and a phone: Skrivro's language at the top, signed in
// with Google so the books follow, or not, and then the few choices that make Skrivro one's own.

type Start = (withGoogle: boolean) => void;

function WayIn({ onStart, canSignIn }: { onStart: Start; canSignIn: boolean }) {
  if (!canSignIn)
    return (
      <button className="button primary large" onClick={() => onStart(false)}>
        {t("Kom igång")}
      </button>
    );
  return (
    <>
      <button className="button primary large" onClick={() => onStart(true)}>
        {t("Logga in med Google")}
      </button>
      <button className="link-button" onClick={() => onStart(false)}>
        {t("Börja utan konto")}
      </button>
    </>
  );
}

type WelcomeProps = {
  onStart: (withGoogle: boolean, choices: Choices) => Promise<void>;
  theme: Theme;
  onTheme: (theme: Theme) => void;
};

// The way in: Skrivro's language, what Skrivro is, and signed in or not.
function Greeting({ onWay }: { onWay: (withGoogle: boolean) => void }) {
  const canSignIn = platform.googleSignIn !== undefined;
  return (
    <main className="welcome" data-tauri-drag-region>
      <WindowBar />
      <div className="welcome-language">
        <UiLanguageChoice />
      </div>
      <img className="brand-mark large" src={logo} alt="" />
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="welcome-text">
        {canSignIn
          ? t("Logga in med Google så följer dina böcker med mellan dina enheter.")
          : t("Böckerna sparas som vanliga filer på den här enheten. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      <WayIn onStart={onWay} canSignIn={canSignIn} />
      <p className="welcome-promise">{t("Dina texter är dina. Aldrig AI-träning.")}</p>
    </main>
  );
}

export function Welcome(props: WelcomeProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [way, setWay] = useState<boolean | null>(null);
  useRootClass("welcome-shown");
  const start = (choices: Choices) =>
    void props
      .onStart(way === true, choices)
      .catch(() => setProblem(t("Inloggningen blev inte klar. Försök igen.")));
  if (way === null) return <Greeting onWay={setWay} />;
  return (
    <main className="welcome" data-tauri-drag-region>
      <WindowBar />
      {problem && (
        <p className="onboarding-problem" role="alert">
          {problem}
        </p>
      )}
      <FirstChoices theme={props.theme} onTheme={props.onTheme} onDone={start} />
    </main>
  );
}
