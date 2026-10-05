import type { DriveStatus, DriveSync } from "../useDriveSync.js";
import { Row } from "./controls.js";
import type { TabProps } from "./settingsTabs.js";
import { t } from "../../i18n/i18n.js";

function statusText(status: DriveStatus) {
  if (status.kind === "syncing") return t("Synkar…");
  if (status.kind === "failed") return status.message;
  if (status.kind === "done") {
    const time = new Date(status.doneAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return t("Synkad {time}", { time });
  }
  return "";
}

function DriveRow({ drive }: { drive: DriveSync }) {
  if (!drive.isOn) {
    return (
      <Row
        label="Google Drive"
        hint={t(
          "Boken sparas också i Penna/<bok> i din Drive, och följer med till dina andra enheter.",
        )}
      >
        <button className="button secondary small" onClick={() => void drive.connect()}>
          {t("Koppla Drive")}
        </button>
      </Row>
    );
  }
  return (
    <Row label="Google Drive" hint={statusText(drive.status)}>
      <button className="button secondary small" onClick={() => void drive.syncNow()}>
        {t("Synka nu")}
      </button>
      <button className="link-button" onClick={() => void drive.disconnect()}>
        {t("Koppla från")}
      </button>
    </Row>
  );
}

export function SyncTab({ book }: TabProps) {
  if (!book) return <Row label={t("Öppna en bok för att synka den.")} />;
  if (!book.drive.isAvailable) return <Row label={t("Synk finns inte på den här enheten än.")} />;
  return (
    <>
      <DriveRow drive={book.drive} />
      {book.drive.status.kind === "signingIn" && (
        <Row
          label={t("Fortsätt i Googles inloggning.")}
          hint={t("Penna kommer tillbaka av sig själv när du är klar.")}
        />
      )}
      {book.drive.status.kind === "failed" && !book.drive.isOn && (
        <Row label={book.drive.status.message} />
      )}
    </>
  );
}
