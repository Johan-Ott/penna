import { useState } from "react";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { Dialog } from "@llkit/controls.js";
import { changesIn, keptNotes } from "@llkit/releaseNotes.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { platform } from "./platform.js";
import { t, uiLanguage } from "../i18n/i18n.js";

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

// Read once when Penna starts: a fresh install has nothing to tell, an update does.
const updatedFrom = browserStorage().getItem(SEEN);
browserStorage().setItem(SEEN, __APP_VERSION__);
const isJustUpdated = updatedFrom !== null && updatedFrom !== __APP_VERSION__;

const newsPage = () =>
  `https://johan-ott.github.io/penna/${uiLanguage() === "en" ? "news.html" : "nytt.html"}`;

/** The first time a new version opens: what is new in it, and a way to say what you think. */
export function WhatsNew() {
  const [isShown, setShown] = useState(isJustUpdated);
  const feedback = useFeedbackDialog();
  const close = () => setShown(false);
  if (!isShown) return feedback.layer;
  return (
    <Dialog label={t("Nytt i Penna {version}", { version: __APP_VERSION__ })} onClose={close}>
      <Changes notes={keptNotes(__APP_VERSION__)} />
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
