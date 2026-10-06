import { useEffect, useState, type ReactNode } from "react";
import { plainText } from "../../manuscript/compare.js";
import { sceneTitle, splitSceneFile } from "../../manuscript/sceneFile.js";
import { diffWords } from "../../manuscript/wordDiff.js";
import type { FileChange, NodeChange, NodeConflict } from "../../sync/syncLog.js";
import { platform } from "../platform.js";
import type { DiskConflict } from "../sceneSession.js";
import { copyDevice, readSyncCopy } from "../syncRepairs.js";
import type { Project } from "../useProject.js";
import type { ReviewItem, SyncReview } from "./useSyncReview.js";
import { t } from "../../i18n/i18n.js";

export const FIELDS: Record<string, string> = {
  title: t("titeln"),
  summary: t("sammanfattningen"),
  when: t("när"),
  subtitle: t("undertiteln"),
  epigraph: t("citatet"),
  epigraphBy: t("vem citatet är av"),
  opening: t("kapitelmallen"),
  pictures: t("bilderna"),
};
export const KINDS: Record<string, string> = {
  part: t("Del"),
  chapter: t("Kapitel"),
  scene: t("Scen"),
  folder: t("Mapp"),
  sort: t("Sort"),
};

export const fileName = (path: string) => path.slice(path.lastIndexOf("/") + 1);
export const titleIn = (text: string | null) =>
  text ? sceneTitle(splitSceneFile(text).frontMatter) : null;
export const bodyOf = (text: string | null) =>
  text ? plainText(splitSceneFile(text).body, "\n\n") : "";
export const shown = (value: unknown) => {
  if (value === undefined) return "";
  return typeof value === "string" ? value : JSON.stringify(value);
};

export interface PaneProps {
  project: Project;
  review: SyncReview;
}

/** The text before on the left with what went, after on the right with what came. */
function SideBySide(props: {
  before: string;
  after: string;
  labels: [string, string];
  actions?: [ReactNode, ReactNode];
}) {
  const parts = diffWords(props.before, props.after);
  const side = (keep: "removed" | "added") =>
    parts.map((part, index) => {
      if (part.kind === "same") return <span key={index}>{part.text}</span>;
      if (part.kind !== keep) return null;
      return keep === "removed" ? (
        <del key={index}>{part.text}</del>
      ) : (
        <ins key={index}>{part.text}</ins>
      );
    });
  return (
    <div className="sync-columns">
      {(["removed", "added"] as const).map((keep, index) => (
        <section key={keep} className="sync-column">
          <span className="design-section">{props.labels[index]}</span>
          <div className="sync-text">{side(keep)}</div>
          {props.actions?.[index]}
        </section>
      ))}
    </div>
  );
}

const KeepButton = ({ onClick }: { onClick: () => void }) => (
  <button className="button secondary small" onClick={onClick}>
    {t("Behåll den här")}
  </button>
);

function CopyPane({
  project,
  review,
  item,
}: PaneProps & { item: Extract<ReviewItem, { kind: "copy" }> }) {
  const [versions, setVersions] = useState<DiskConflict | null>(null);
  useEffect(() => {
    void readSyncCopy(platform.fileSystem, project.dir, item.copy).then(setVersions);
  }, [project.dir, item.copy]);
  if (!versions) return null;
  const keep = (choice: "mine" | "theirs" | "both") => () =>
    void review.chooseCopy(item.copy, choice);
  const other = copyDevice(item.copy.fileName) ?? t("Den andra versionen");
  return (
    <>
      <SideBySide
        before={bodyOf(versions.editorText)}
        after={bodyOf(versions.diskText)}
        labels={[t("Den här enheten"), other]}
        actions={[
          <KeepButton key="mine" onClick={keep("mine")} />,
          <KeepButton key="theirs" onClick={keep("theirs")} />,
        ]}
      />
      <button className="button secondary small" onClick={keep("both")}>
        {t("Behåll båda, som två scener")}
      </button>
    </>
  );
}

function ConflictPane({ review, conflict }: { review: SyncReview; conflict: NodeConflict }) {
  return (
    <SideBySide
      before={shown(conflict.here)}
      after={shown(conflict.drive)}
      labels={[t("Den här enheten"), t("Från Drive")]}
      actions={[
        <KeepButton key="here" onClick={() => void review.chooseNode(conflict, false)} />,
        <KeepButton key="drive" onClick={() => void review.chooseNode(conflict, true)} />,
      ]}
    />
  );
}

function NodePane({ change }: { change: NodeChange }) {
  if (change.kind !== "changed") return <p>{t("Strukturen ändrades på en annan enhet.")}</p>;
  return (
    <SideBySide
      before={shown(change.before)}
      after={shown(change.after)}
      labels={[t("Före"), t("Nu")]}
    />
  );
}

function FilePane({ review, change }: { review: SyncReview; change: FileChange }) {
  if (change.before === null && change.after === null) return <p>{fileName(change.path)}</p>;
  return (
    <>
      <SideBySide
        before={bodyOf(change.before)}
        after={bodyOf(change.after)}
        labels={[t("Före"), t("Nu")]}
      />
      {change.trashPath && (
        <button className="button secondary small" onClick={() => void review.putBack(change)}>
          {t("Lägg tillbaka")}
        </button>
      )}
    </>
  );
}

/** Both versions of the chosen row, and the choice when it is a conflict. */
export function Pane({ project, review, item }: PaneProps & { item: ReviewItem }) {
  if (item.kind === "copy") return <CopyPane project={project} review={review} item={item} />;
  if (item.kind === "conflict") return <ConflictPane review={review} conflict={item.conflict} />;
  if (item.kind === "node") return <NodePane change={item.change} />;
  return <FilePane review={review} change={item.change} />;
}
