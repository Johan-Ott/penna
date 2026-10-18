import { useState } from "react";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { platform } from "./platform.js";
import { t, uiLanguage } from "../i18n/i18n.js";

const SEEN = "penna.seenVersion";

// Read once when Penna starts: a fresh install has nothing to tell, an update does.
const updatedFrom = browserStorage().getItem(SEEN);
browserStorage().setItem(SEEN, __APP_VERSION__);
const isJustUpdated = updatedFrom !== null && updatedFrom !== __APP_VERSION__;

const newsPage = () =>
  `https://johan-ott.github.io/penna/${uiLanguage() === "en" ? "news.html" : "nytt.html"}`;

/** After an update, once: what is new, and a way to say what the writer thinks of it. */
export function WhatsNew() {
  const [isShown, setShown] = useState(isJustUpdated);
  const feedback = useFeedbackDialog();
  if (!isShown) return feedback.layer;
  return (
    <>
      <div className="toast update-notice" role="status">
        <span>{t("Penna är uppdaterad till {version}.", { version: __APP_VERSION__ })}</span>
        <button className="link-button" onClick={() => void platform.openLink(newsPage())}>
          {t("Se vad som är nytt")}
        </button>
        <button className="link-button" onClick={feedback.open}>
          {t("Tyck till")}
        </button>
        <button className="link-button quiet" onClick={() => setShown(false)}>
          {t("Stäng")}
        </button>
      </div>
      {feedback.layer}
    </>
  );
}
