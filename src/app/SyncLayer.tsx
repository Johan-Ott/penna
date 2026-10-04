import { useState } from "react";
import { insertAfter, type TreeNode } from "../project/tree.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import { ConflictDialog } from "./ConflictDialog.js";
import { platform } from "./platform.js";
import type { ConflictChoice, DiskConflict, SceneSession } from "./sceneSession.js";
import {
  copyDevice,
  crashSceneId,
  keepVersion,
  readSyncCopy,
  restoreCrashText,
  setAsideCrashText,
} from "./syncRepairs.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

interface SyncCopy {
  copy: SceneFileRef;
  versions: DiskConflict;
}

const titleOf = (project: Project, id: string) => project.summaries[id]?.title ?? t("Namnlös scen");

/** The sync copy the writer is looking at, and what happens when they choose. */
export function useSyncCopy(
  project: Project | null,
  session: SceneSession,
  updateTree: (tree: TreeNode[]) => Promise<void>,
  refresh: () => Promise<void>,
) {
  const [syncCopy, setSyncCopy] = useState<SyncCopy | null>(null);
  const showSyncCopy = async (copy: SceneFileRef) => {
    if (!project) return;
    setSyncCopy({ copy, versions: await readSyncCopy(platform.fileSystem, project.dir, copy) });
  };
  const chooseSyncCopy = async (choice: ConflictChoice) => {
    if (!project || !syncCopy) return;
    const { copy } = syncCopy;
    setSyncCopy(null);
    const newId = await keepVersion(session, project.dir, copy, choice);
    if (newId)
      await updateTree(insertAfter(project.tree, { id: newId, kind: "scene" }, copy.sceneId));
    await refresh();
  };
  return { syncCopy, showSyncCopy, chooseSyncCopy, closeSyncCopy: () => setSyncCopy(null) };
}

export function SyncCopyDialog(props: { project: Project } & ReturnType<typeof useSyncCopy>) {
  const { syncCopy } = props;
  if (!syncCopy) return null;
  return (
    <ConflictDialog
      sceneTitle={titleOf(props.project, syncCopy.copy.sceneId)}
      conflict={syncCopy.versions}
      otherLabel={copyDevice(syncCopy.copy.fileName) ?? undefined}
      text={t("Scenen ändrades på två enheter innan molnet hann synka. Inget har raderats.")}
      onChoose={(choice) => void props.chooseSyncCopy(choice)}
      onLater={props.closeSyncCopy}
    />
  );
}

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

// Shown before any scene opens, since the next save would write over the crash text.
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

/** What needs the writer's eye: sync copies to settle, scenes still in the cloud. */
export function SyncNotices(props: {
  project: Project;
  onShowSyncCopy: (copy: SceneFileRef) => void;
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
  if (notices.length === 0 && project.conflicts.length === 0) return null;
  return (
    <ul className="sidebar-notices" aria-label={t("Att se över")}>
      {project.conflicts.map((copy) => (
        <li key={copy.fileName}>
          <button className="link-button" onClick={() => props.onShowSyncCopy(copy)}>
            {t("Två versioner av ”{title}”", { title: titleOf(project, copy.sceneId) })}
          </button>
        </li>
      ))}
      {notices.map((notice) => (
        <li key={notice}>{notice}</li>
      ))}
    </ul>
  );
}
