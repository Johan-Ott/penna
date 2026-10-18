import { useEffect, useState } from "react";
import type { AppUpdate } from "./platform.js";
import type { SceneSession } from "./sceneSession.js";
import { checkForUpdates, dismissUpdates, useUpdates } from "@llkit/updates.js";
import { Dialog } from "@llkit/controls.js";
import { keepNotes } from "@llkit/releaseNotes.js";
import { t } from "../i18n/i18n.js";
import { Changes, WhatsNew } from "./WhatsNew.js";

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

// Saved first: a scene that cannot be saved stays open, since the restart would lose it.
function useInstall(update: AppUpdate, session: SceneSession) {
  const [progress, setProgress] = useState<number | null>(null);
  const install = async () => {
    setProgress(0);
    if (!(await session.autosave.flush())) return setProgress(null);
    await update.install(setProgress).catch(() => undefined);
    setProgress(null);
  };
  return { progress, install };
}

function UpdateDialog(props: { update: AppUpdate; session: SceneSession; onClose: () => void }) {
  const { update, session, onClose } = props;
  const { progress, install } = useInstall(update, session);
  const action = update.isDownload ? t("Hämta") : t("Starta om och uppdatera");
  return (
    <Dialog label={t("Penna {version} finns", { version: update.version })} onClose={onClose}>
      <Changes notes={update.notes ?? ""} />
      {progress !== null && !update.isDownload && (
        <progress className="update-progress" value={progress} max={1} aria-label={t("Hämtar")} />
      )}
      <div className="dialog-actions">
        <button className="button ghost" onClick={onClose}>
          {t("Senare")}
        </button>
        <button
          className="button primary"
          disabled={progress !== null}
          onClick={() => void install()}
        >
          {progress === null ? action : t("Uppdaterar…")}
        </button>
      </div>
    </Dialog>
  );
}

function NewVersion({ update, session }: { update: AppUpdate; session: SceneSession }) {
  const [isOpen, setOpen] = useState(false);
  useEffect(() => keepNotes(update.version, update.notes ?? ""), [update]);
  return (
    <>
      <div className="toast update-notice" role="status">
        <span>{t("Penna {version} finns.", { version: update.version })}</span>
        <button className="link-button" onClick={() => setOpen(true)}>
          {t("Se vad som är nytt")}
        </button>
        <button className="link-button quiet" onClick={dismissUpdates}>
          {t("Senare")}
        </button>
      </div>
      {isOpen && <UpdateDialog update={update} session={session} onClose={() => setOpen(false)} />}
    </>
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

/** A newer Penna, offered quietly; when asked for by hand, that this is the newest; and after an
 *  update, what is new. */
export function UpdateNotice({ session }: { session: SceneSession }) {
  useRegularChecks();
  const { update, isLatest } = useUpdates();
  if (update) return <NewVersion update={update} session={session} />;
  return isLatest ? <IsLatest /> : <WhatsNew />;
}
