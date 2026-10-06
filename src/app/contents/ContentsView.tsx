import { useState } from "react";
import { designOf, trimSize } from "../../export/bookDesign.js";
import type { PageMap } from "../../project/pageMap.js";
import { Row } from "./ContentsRowView.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import {
  contentsRows,
  inTimeOrder,
  movedInTime,
  type ContentsRow,
} from "../../project/contents.js";
import { projectGoals, shortDay } from "../../project/progress.js";
import { KIND_LABELS } from "../../project/shelf.js";
import type { TreeNode } from "../../project/tree.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

interface ContentsProps {
  project: Project;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
  onReadBook: () => void;
  /** The printed book's pages, once they are counted; null while they are not shown. */
  pageMap: PageMap | null;
}

const format = (words: number) => words.toLocaleString(numberLocale());

function metaLine(project: Project, pageMap: PageMap | null) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goals = projectGoals(project.fields);
  const type = project.fields["type"];
  const kind = typeof type === "string" ? KIND_LABELS[type] : undefined;
  const count = goals.totalGoal
    ? t("{words} av {goal} ord", { words: format(words), goal: format(goals.totalGoal) })
    : t("{count} ord", { count: format(words) });
  const deadline = goals.deadline ? t("deadline {day}", { day: shortDay(goals.deadline) }) : null;
  const { width, height } = trimSize(designOf(project.fields).trim);
  const pages = pageMap
    ? t("{pages} sidor i {width} × {height} mm", { pages: format(pageMap.pages), width, height })
    : null;
  return [kind, count, pages, deadline].filter(Boolean).join(" · ");
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
      <span className="contents-meta">{metaLine(props.project, props.pageMap)}</span>
      <button className="link-button quiet contents-read" onClick={props.onReadBook}>
        {t("Läs hela boken")}
      </button>
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
