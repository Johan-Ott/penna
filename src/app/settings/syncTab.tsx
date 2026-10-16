import type { DriveStatus } from "../useDriveSync.js";
import { signIn, signOut } from "../googleAccount.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { Row } from "../controls.js";
import type { TabProps } from "./settingsTabs.js";
import { t } from "../../i18n/i18n.js";

function statusText(status: DriveStatus | undefined) {
  if (status?.kind === "syncing") return t("Synkar…");
  if (status?.kind === "failed") return status.message;
  if (status?.kind === "done") {
    const time = new Date(status.doneAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return t("Synkad {time}", { time });
  }
  return t("Böcker, profil och inställningar följer med till dina andra enheter.");
}

function SignInRow({ updatePreferences }: Pick<TabProps, "updatePreferences">) {
  const start = () => void signIn(updatePreferences).catch(recordFailure("Inloggning med Google"));
  return (
    <Row
      label={t("Google-konto")}
      hint={t("Logga in så sparas allt i mappen Penna i din egen Drive och följer med dig.")}
    >
      <button className="button primary small" onClick={start}>
        {t("Logga in med Google")}
      </button>
    </Row>
  );
}

/** One row: signed in with Google or not. Everything else follows on its own. */
export function SyncTab({ book, preferences, updatePreferences }: TabProps) {
  if (!platform.googleSignIn) return <Row label={t("Synk finns inte på den här enheten än.")} />;
  if (!preferences.isDriveSyncOn) return <SignInRow updatePreferences={updatePreferences} />;
  return (
    <Row label={t("Google-konto")} hint={statusText(book?.drive.status)}>
      {book && (
        <button className="button secondary small" onClick={() => void book.drive.syncNow()}>
          {t("Synka nu")}
        </button>
      )}
      <button className="link-button" onClick={() => void signOut(updatePreferences)}>
        {t("Logga ut")}
      </button>
    </Row>
  );
}
