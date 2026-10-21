import type { DriveStatus } from "../useDriveSync.js";
import { signIn, signOut } from "../googleAccount.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import { Row } from "@llkit/controls.js";
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
      hint={t("Logga in så sparas allt i mappen Skrivro i din egen Drive och följer med dig.")}
    >
      <button className="button primary small" onClick={start}>
        {t("Logga in med Google")}
      </button>
    </Row>
  );
}

// A book is a folder like any other, so a sync service can carry it without Skrivro knowing.
// Only where Skrivro has a folder on the device: a phone keeps its books in the app's own.
function FolderRow() {
  if (!platform.showInFolder) return null;
  return (
    <Row
      label={t("Utan konto")}
      hint={t("Bokmappen i iCloud Drive, OneDrive eller Dropbox följer med dina datorer.")}
    />
  );
}

function GoogleRow({ book, preferences, updatePreferences }: TabProps) {
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

// Taken in without asking, so what came can still be looked over and taken back here.
function ChangesRow({ book }: Pick<TabProps, "book">) {
  if (!book || book.syncChanges === 0) return null;
  return (
    <Row
      label={t("Hämtat från synken")}
      hint={t("{count} ändringar från dina andra enheter", { count: book.syncChanges })}
    >
      <button className="button secondary small" onClick={book.onShowSyncChanges}>
        {t("Visa ändringarna")}
      </button>
    </Row>
  );
}

/** Two ways: a Google account, or a sync service carrying the folder. */
export function SyncTab(props: TabProps) {
  return (
    <>
      <GoogleRow {...props} />
      <ChangesRow book={props.book} />
      <FolderRow />
    </>
  );
}
