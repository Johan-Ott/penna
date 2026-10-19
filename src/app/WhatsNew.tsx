import { useEffect, useState } from "react";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { Dialog } from "@llkit/controls.js";
import { changesIn, keptNotes } from "@llkit/releaseNotes.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { platform } from "./platform.js";
import { t } from "../i18n/i18n.js";
import { newsPage } from "./settings/helpTab.js";

/** The changes in a version, or a plain line when the release says none. */
export function Changes({ notes }: { notes: string }) {
  const changes = changesIn(notes);
  if (changes.length === 0) return <p>{t("Rättelser och förbättringar.")}</p>;
  return (
    <ul className="release-changes">
      {changes.map((change) => (
        <li key={change}>{change}</li>
      ))}
    </ul>
  );
}

const SEEN = "penna.seenVersion";

// Read once when Skrivro starts: a fresh install has nothing to tell, an update does.
const updatedFrom = browserStorage().getItem(SEEN);
browserStorage().setItem(SEEN, __APP_VERSION__);
const isJustUpdated = updatedFrom !== null && updatedFrom !== __APP_VERSION__;

/** The first time a new version opens: what is new in it, and a way to say what you think. */
// An update from a version that kept no notes: the release says what is new instead.
function useNotes(isShown: boolean) {
  const [notes, setNotes] = useState(() => keptNotes(__APP_VERSION__));
  useEffect(() => {
    if (!isShown || notes) return;
    const release = `https://api.github.com/repos/Johan-Ott/penna/releases/tags/v${__APP_VERSION__}`;
    void platform
      .webFetch(release)
      .then((response) => (response.ok ? response.json() : null))
      .then((found: { body?: string } | null) => found?.body && setNotes(found.body))
      .catch(() => undefined);
  }, [isShown, notes]);
  return notes;
}

export function WhatsNew() {
  const [isShown, setShown] = useState(isJustUpdated);
  const notes = useNotes(isShown);
  const feedback = useFeedbackDialog();
  const close = () => setShown(false);
  if (!isShown) return feedback.layer;
  return (
    <Dialog label={t("Nytt i Skrivro {version}", { version: __APP_VERSION__ })} onClose={close}>
      <Changes notes={notes} />
      <button className="link-button" onClick={() => void platform.openLink(newsPage())}>
        {t("Se allt som är nytt och vad som kommer")}
      </button>
      <div className="dialog-actions">
        <button className="button ghost" onClick={() => (close(), feedback.open())}>
          {t("Tyck till")}
        </button>
        <button className="button primary" onClick={close}>
          {t("Börja skriva")}
        </button>
      </div>
    </Dialog>
  );
}
