import { useEffect, useState } from "react";
import type { AppUpdate } from "./platform.js";
import type { SceneSession } from "./sceneSession.js";
import { checkForUpdates, dismissUpdates, useUpdates } from "./updates.js";
import { t } from "../i18n/i18n.js";

// At the start and then every six hours, as long as Penna is open.
const EVERY = 6 * 60 * 60 * 1000;
const SAID_FOR = 4000;

function useRegularChecks() {
  useEffect(() => {
    void checkForUpdates();
    const timer = setInterval(() => void checkForUpdates(), EVERY);
    return () => clearInterval(timer);
  }, []);
}

function NewVersion({ update, session }: { update: AppUpdate; session: SceneSession }) {
  const [isInstalling, setInstalling] = useState(false);
  const install = async () => {
    setInstalling(true);
    // A scene that cannot be saved stays open; the restart would lose it.
    if (!(await session.autosave.flush())) return setInstalling(false);
    await update.install().catch(() => undefined);
    setInstalling(false);
  };
  const action = update.isDownload ? t("Hämta") : t("Starta om och uppdatera");
  return (
    <div className="toast update-notice" role="status">
      <span>{t("Penna {version} finns.", { version: update.version })}</span>
      <button className="link-button" disabled={isInstalling} onClick={() => void install()}>
        {isInstalling ? t("Uppdaterar…") : action}
      </button>
      <button className="link-button quiet" onClick={dismissUpdates}>
        {t("Senare")}
      </button>
    </div>
  );
}

function IsLatest() {
  useEffect(() => {
    const timer = setTimeout(dismissUpdates, SAID_FOR);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div className="toast update-notice" role="status">
      <span>{t("Du har den senaste versionen av Penna.")}</span>
    </div>
  );
}

/** A newer Penna, offered quietly; or, when asked for by hand, that this is the newest. */
export function UpdateNotice({ session }: { session: SceneSession }) {
  useRegularChecks();
  const { update, isLatest } = useUpdates();
  if (update) return <NewVersion update={update} session={session} />;
  return isLatest ? <IsLatest /> : null;
}
