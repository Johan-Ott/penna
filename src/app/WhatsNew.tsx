import { useEffect, useState } from "react";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { Dialog } from "@llkit/controls.js";
import { changesIn, changesSince, keptNotes, type Release } from "@llkit/releaseNotes.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { platform } from "./platform.js";
import { t } from "../i18n/i18n.js";
import { newsPage } from "./settings/helpTab.js";

const RELEASES = "https://api.github.com/repos/Johan-Ott/skrivro/releases?per_page=30";

/** What is new after `from` up to `to`, from every release between them; the notes at hand
 * until they are read, and when there is no network. */
export function useChangesSince(from: string | null, to: string, notes: string, isWanted = true) {
  const [changes, setChanges] = useState(() => changesIn(notes));
  useEffect(() => {
    if (!isWanted || from === null) return;
    void platform
      .webFetch(RELEASES)
      .then((response) => (response.ok ? response.json() : null))
      .then((found: Release[] | null) => {
        const since = found ? changesSince(found, from, to) : [];
        if (since.length > 0) setChanges(since);
      })
      .catch(() => undefined);
  }, [from, to, isWanted]);
  return changes;
}

/** The changes, or a plain line when the releases say none. */
export function Changes({ changes }: { changes: string[] }) {
  if (changes.length === 0) return <p>{t("Rättelser och förbättringar.")}</p>;
  return (
    <ul className="release-changes">
      {changes.map((change) => (
        <li key={change}>{change}</li>
      ))}
    </ul>
  );
}

const SEEN = "skrivro.seenVersion";

// Read once when Skrivro starts: a fresh install has nothing to tell, an update does.
const updatedFrom = browserStorage().getItem(SEEN);
browserStorage().setItem(SEEN, __APP_VERSION__);
const isJustUpdated = updatedFrom !== null && updatedFrom !== __APP_VERSION__;

/** The first time a new version opens: what is new since the last one, and a way to say what
 * you think. */
export function WhatsNew() {
  const [isShown, setShown] = useState(isJustUpdated);
  const changes = useChangesSince(
    updatedFrom,
    __APP_VERSION__,
    keptNotes(__APP_VERSION__),
    isShown,
  );
  const feedback = useFeedbackDialog();
  const close = () => setShown(false);
  if (!isShown) return feedback.layer;
  return (
    <Dialog label={t("Nytt i Skrivro {version}", { version: __APP_VERSION__ })} onClose={close}>
      <Changes changes={changes} />
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
