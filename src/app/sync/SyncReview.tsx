import { useState } from "react";
import type { FileChange, NodeChange, NodeFields } from "../../sync/syncLog.js";
import type { Project } from "../useProject.js";
import { FIELDS, fileName, KINDS, Pane, titleIn, type PaneProps } from "./reviewPanes.js";
import type { ReviewItem } from "./useSyncReview.js";
import { t } from "../../i18n/i18n.js";

const BADGES = {
  added: t("Ny"),
  changed: t("Ändrad"),
  removed: t("Borttagen"),
  moved: t("Flyttad"),
};

function nodeName(project: Project, node: NodeFields) {
  return node.title ?? project.summaries[node.id]?.title ?? KINDS[node.kind] ?? node.id;
}

function fileLabel(change: FileChange): [string, string] {
  const name = titleIn(change.after) ?? titleIn(change.before) ?? fileName(change.path);
  return [BADGES[change.kind], name];
}

function nodeLabel(project: Project, change: NodeChange): [string, string] {
  const name = nodeName(project, change.node);
  const field = change.field && (FIELDS[change.field] ?? change.field);
  return [BADGES[change.kind], field ? `${name}: ${field}` : name];
}

function itemLabel(project: Project, item: ReviewItem): [string, string] {
  if (item.kind === "file") return fileLabel(item.change);
  if (item.kind === "node") return nodeLabel(project, item.change);
  if (item.kind === "conflict") {
    const field = FIELDS[item.conflict.field] ?? item.conflict.field;
    return [t("Krock"), `${nodeName(project, item.conflict.node)}: ${field}`];
  }
  const title = project.summaries[item.copy.sceneId]?.title ?? t("Namnlös scen");
  return [t("Krock"), t("Två versioner av ”{title}”", { title })];
}

function ReviewList(props: {
  project: Project;
  items: ReviewItem[];
  chosen: string;
  onChoose: (key: string) => void;
}) {
  return (
    <ul className="sync-list">
      {props.items.map((item) => {
        const [badge, label] = itemLabel(props.project, item);
        return (
          <li key={item.key}>
            <button
              className={item.key === props.chosen ? "sync-item chosen" : "sync-item"}
              onClick={() => props.onChoose(item.key)}
            >
              <span className={`sync-badge ${item.kind}`}>{badge}</span>
              <span>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function SyncHeader(props: { onBack: () => void; onDone: () => void }) {
  return (
    <header className="sync-header">
      <button className="link-button quiet" onClick={props.onBack}>
        {t("← Tillbaka till texten")}
      </button>
      <h2>{t("Från synken")}</h2>
      <button className="button primary small" onClick={props.onDone}>
        {t("Klart")}
      </button>
    </header>
  );
}

/** Like source control, in the writing area: the list on the left, both versions on the right. */
export function SyncView({ project, review, onBack }: PaneProps & { onBack: () => void }) {
  const [chosen, setChosen] = useState("");
  const item = review.items.find((candidate) => candidate.key === chosen) ?? review.items[0];
  return (
    <main className="sync-view">
      <SyncHeader onBack={onBack} onDone={() => void review.done().then(onBack)} />
      {review.items.length === 0 ? (
        <p className="contents-empty">{t("Inget nytt från synken.")}</p>
      ) : (
        <div className="sync-body">
          <ReviewList
            project={project}
            items={review.items}
            chosen={item?.key ?? ""}
            onChoose={setChosen}
          />
          <div className="sync-pane">
            {item && <Pane key={item.key} project={project} review={review} item={item} />}
          </div>
        </div>
      )}
    </main>
  );
}
