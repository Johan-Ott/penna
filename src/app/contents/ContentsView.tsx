import { useState } from "react";
import type { PageMap } from "../../project/pageMap.js";
import { Row } from "./ContentsRowView.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import {
  contentsRows,
  inTimeOrder,
  movedInTime,
  type ContentsRow,
} from "../../project/contents.js";
import type { TreeNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import type { Stats } from "../../project/stats.js";
import { BookMeta, PageGrid } from "./BookOverview.js";
import { t } from "../../i18n/i18n.js";

interface ContentsProps {
  project: Project;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
  onReadBook: () => void;
  /** The drafts of the whole book. */
  onShowDrafts: () => void;
  /** The printed book's pages, once they are counted; null while they are not shown. */
  pageMap: PageMap | null;
  /** The words of each day, for when the first draft is done at this pace. */
  stats: Stats;
}

const timeOrderOf = (fields: Record<string, unknown>) => {
  const stored = fields["timeOrder"];
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
};

function useRowDrag(shown: ContentsRow[], onOrder: (order: string[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  return {
    propsFor: (id: string) => ({
      draggable: true,
      onDragStart: () => setDraggedId(id),
      onDragOver: (event: { preventDefault: () => void }) => event.preventDefault(),
      onDrop: () => {
        if (draggedId && draggedId !== id) {
          const index = shown.findIndex((row) => row.id === id);
          onOrder(movedInTime(shown, draggedId, index));
        }
        setDraggedId(null);
      },
      onDragEnd: () => setDraggedId(null),
    }),
  };
}

function OrderSwitch(props: { isTimeOrder: boolean; onChange: (isTimeOrder: boolean) => void }) {
  const option = (label: string, isTimeOrder: boolean) => (
    <button
      role="radio"
      aria-checked={props.isTimeOrder === isTimeOrder}
      onClick={() => props.onChange(isTimeOrder)}
    >
      {label}
    </button>
  );
  return (
    <div className="segmented small" role="radiogroup" aria-label={t("Ordning")}>
      {option(t("Läsordning"), false)}
      {option(t("Tidsordning"), true)}
    </div>
  );
}

function ContentsHeader(props: ContentsProps) {
  return (
    <header className="contents-header">
      <h1>{props.project.name}</h1>
      <BookMeta project={props.project} pageMap={props.pageMap} stats={props.stats} />
      <span className="contents-links">
        <button className="link-button quiet contents-read" onClick={props.onReadBook}>
          {t("Läs hela boken")}
        </button>
        <button className="link-button quiet contents-read" onClick={props.onShowDrafts}>
          {t("Utkast")}
        </button>
      </span>
      {props.pageMap && (
        <PageGrid project={props.project} pageMap={props.pageMap} onOpenScene={props.onOpenScene} />
      )}
    </header>
  );
}

export function ContentsView(props: ContentsProps) {
  const { project } = props;
  const [isTimeOrder, setTimeOrder] = useState(false);
  const rows = contentsRows(project.tree, project.summaries);
  const shown = isTimeOrder ? inTimeOrder(rows, timeOrderOf(project.fields)) : rows;
  const drag = useRowDrag(shown, (timeOrder) => props.onSaveFields({ timeOrder }));
  return (
    <main className="contents-view">
      <div className="contents-column">
        <ContentsHeader {...props} />
        <div className="contents-bar">
          <h2>{t("Innehåll")}</h2>
          <OrderSwitch isTimeOrder={isTimeOrder} onChange={setTimeOrder} />
        </div>
        {rows.length === 0 && <p className="contents-empty">{t("Inga kapitel än.")}</p>}
        <div className="contents-list">
          {shown.map((row) => (
            <Row
              key={row.id}
              {...props}
              row={row}
              pages={props.pageMap?.chapterPages.get(row.id) ?? null}
              dragProps={isTimeOrder ? drag.propsFor(row.id) : {}}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
