import { platform } from "./platform.js";
import { crashSceneId, restoreCrashText, setAsideCrashText } from "./syncRepairs.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

const titleOf = (project: Project, id: string) => project.summaries[id]?.title ?? t("Namnlös scen");

async function settleCrashText(project: Project, restore: boolean) {
  for (const temp of project.recoverable) {
    if (restore) await restoreCrashText(platform.fileSystem, temp);
    else await setAsideCrashText(platform.fileSystem, project.dir, temp);
  }
}

function CrashActions({ onSettle }: { onSettle: (restore: boolean) => void }) {
  return (
    <div className="dialog-actions">
      <button className="button secondary" onClick={() => onSettle(false)}>
        {t("Behåll det sparade")}
      </button>
      <button className="button primary" autoFocus onClick={() => onSettle(true)}>
        {t("Återställ texten")}
      </button>
    </div>
  );
}

// Shown before any scene opens: the next save would overwrite the crash text.
export function CrashDialog({
  project,
  refresh,
}: {
  project: Project;
  refresh: () => Promise<void>;
}) {
  const temps = project.recoverable;
  if (temps.length === 0) return null;
  const titles = temps.map((temp) => `”${titleOf(project, crashSceneId(temp))}”`).join(", ");
  const settle = (restore: boolean) => void settleCrashText(project, restore).then(refresh);
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="crash-title">
        <div className="dialog-heading">
          <span id="crash-title" className="dialog-title">
            {t("Penna stängdes innan allt hann sparas")}
          </span>
          <span className="dialog-text">
            {t(
              "Det finns nyare text än den sparade i {titles}. Inget raderas: det du inte behåller läggs i mappen trash i projektet.",
              { titles },
            )}
          </span>
        </div>
        <CrashActions onSettle={settle} />
      </div>
    </div>
  );
}

function notDownloadedNotice(count: number) {
  if (count === 0) return [];
  return [
    count === 1
      ? t("Hämtar en scen från molnet…")
      : t("Hämtar {count} scener från molnet…", { count }),
  ];
}

export function SyncNotices(props: {
  project: Project;
  reviewCount: number;
  onShowReview: () => void;
}) {
  const { project } = props;
  const repair = project.repairCopy
    ? [
        t("project.json gick inte att läsa. En kopia sparades som {copy}.", {
          copy: project.repairCopy,
        }),
      ]
    : [];
  const notices = [...repair, ...notDownloadedNotice(project.notDownloaded.length)];
  if (notices.length === 0 && props.reviewCount === 0) return null;
  return (
    <ul className="sidebar-notices" aria-label={t("Att se över")}>
      {props.reviewCount > 0 && (
        <li>
          <button className="link-button" onClick={props.onShowReview}>
            {t("Från synken: {count} att se över", { count: props.reviewCount })}
          </button>
        </li>
      )}
      {notices.map((notice) => (
        <li key={notice}>{notice}</li>
      ))}
    </ul>
  );
}
