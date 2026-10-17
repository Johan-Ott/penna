import { useState } from "react";
import logo from "../../assets/penna-logo.png";
import { platform } from "../platform.js";
import { useRootClass } from "../useRootClass.js";
import { WindowBar } from "../shell/WindowControls.js";
import { t } from "../../i18n/i18n.js";

// The first start, the same on a computer and a phone: signed in with Google, so the books
// follow, or not. Language, folder and the first book come after, each where it belongs.

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

export function Welcome({ onStart }: { onStart: (withGoogle: boolean) => Promise<void> }) {
  const [problem, setProblem] = useState<string | null>(null);
  useRootClass("welcome-shown");
  const start = (withGoogle: boolean) =>
    void onStart(withGoogle).catch(() =>
      setProblem(t("Inloggningen blev inte klar. Försök igen.")),
    );
  const canSignIn = platform.googleSignIn !== undefined;
  return (
    <main className="welcome" data-tauri-drag-region>
      <WindowBar />
      <img className="brand-mark large" src={logo} alt="" />
      <h1>{t("Skriv var du än är.")}</h1>
      <p className="welcome-text">
        {canSignIn
          ? t("Logga in med Google så följer dina böcker med mellan dina enheter.")
          : t("Böckerna sparas som vanliga filer på den här enheten. Inget konto behövs.")}
      </p>
      <span className="spacer" />
      {problem && (
        <p className="onboarding-problem" role="alert">
          {problem}
        </p>
      )}
      <WayIn onStart={start} canSignIn={canSignIn} />
      <p className="welcome-promise">{t("Dina texter är dina. Aldrig AI-träning.")}</p>
    </main>
  );
}
