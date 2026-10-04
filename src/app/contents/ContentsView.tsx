import { useState } from "react";
import { SCENE_STATUSES, type SceneStatus } from "../../manuscript/sceneFile.js";
import {
  contentsRows,
  inTimeOrder,
  movedInTime,
  withNodeText,
  type ContentsRow,
} from "../../project/contents.js";
import { projectGoals, shortDay } from "../../project/progress.js";
import { KIND_LABELS } from "../../project/shelf.js";
import type { TreeNode } from "../../project/tree.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { useMenuButton, type MenuItem } from "../Menu.js";
import { STATUS_LABELS } from "../tree/treeMenus.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

interface ContentsProps {
  project: Project;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSaveFields: (fields: Record<string, unknown>) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
}

const format = (words: number) => words.toLocaleString(numberLocale());

// "Roman · 48 210 av 80 000 ord · deadline 15 jan"
function metaLine(project: Project) {
  const words = manuscriptWords(project.tree, project.summaries);
  const goals = projectGoals(project.fields);
  const type = project.fields["type"];
  const kind = typeof type === "string" ? KIND_LABELS[type] : undefined;
  const count = goals.totalGoal
    ? t("{words} av {goal} ord", { words: format(words), goal: format(goals.totalGoal) })
    : t("{count} ord", { count: format(words) });
  const deadline = goals.deadline ? t("deadline {day}", { day: shortDay(goals.deadline) }) : null;
  return [kind, count, deadline].filter(Boolean).join(" · ");
}

const timeOrderOf = (fields: Record<string, unknown>) => {
  const stored = fields["timeOrder"];
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
};

// A quiet field: it looks like text until it is clicked, and saves when it is left.
function InlineText(props: {
  value: string;
  label: string;
  className: string;
  onSave: (text: string) => void;
}) {
  return (
    <input
      key={props.value}
      className={`inline-text ${props.className}`}
      aria-label={props.label}
      placeholder={props.label}
      defaultValue={props.value}
      onClick={(event) => event.stopPropagation()}
      onBlur={(event) => event.target.value !== props.value && props.onSave(event.target.value)}
      onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
    />
  );
}

function StatusButton(props: ContentsProps & { row: ContentsRow }) {
  const { row } = props;
  const items: MenuItem[] = SCENE_STATUSES.map((status) => ({
    label: STATUS_LABELS[status],
    isChecked: status === row.status,
    onSelect: () => props.onSetStatus(row.sceneIds, status),
  }));
  const menu = useMenuButton(t("Status"), items);
  return (
    <>
      <button className="contents-status" onClick={menu.open}>
        {STATUS_LABELS[row.status]}
      </button>
      {menu.menu}
    </>
  );
}

// The chapter's number and title; a click opens its first scene.
function RowTitle(props: { row: ContentsRow; onOpenScene: (id: string) => void }) {
  const { row } = props;
  const firstScene = row.sceneIds[0];
  return (
    <button className="contents-title" onClick={() => firstScene && props.onOpenScene(firstScene)}>
      {row.number === null ? row.title : `${row.number}. ${row.title}`}
    </button>
  );
}

function Row(
  props: ContentsProps & { row: ContentsRow; drag: ReturnType<typeof useRowDrag> | null },
) {
  const { row, project } = props;
  const save = (field: "summary" | "when") => (text: string) =>
    props.onChangeTree(withNodeText(project.tree, row.id, field, text));
  return (
    <div className="contents-row" {...props.drag?.propsFor(row.id)}>
      <div className="contents-main">
        <RowTitle row={row} onOpenScene={props.onOpenScene} />
        <InlineText
          value={row.summary}
          label={t("Vad händer?")}
          className="contents-summary"
          onSave={save("summary")}
        />
      </div>
      <InlineText
        value={row.when}
        label={t("När?")}
        className="contents-when"
        onSave={save("when")}
      />
      <span className="contents-words">{format(row.words)}</span>
      <StatusButton {...props} />
    </div>
  );
}

// In Tidsordning the rows are dragged into the order the story happens in.
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

// Läsordning or Tidsordning: the book as it is read, or as the story happens.
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

/** Innehåll: the book's title and numbers, and every chapter with what happens, when and how far. */
export function ContentsView(props: ContentsProps) {
  const { project } = props;
  const [isTimeOrder, setTimeOrder] = useState(false);
  const rows = contentsRows(project.tree, project.summaries);
  const shown = isTimeOrder ? inTimeOrder(rows, timeOrderOf(project.fields)) : rows;
  const drag = useRowDrag(shown, (timeOrder) => props.onSaveFields({ timeOrder }));
  return (
    <main className="contents-view">
      <div className="contents-column">
        <header className="contents-header">
          <h1>{project.name}</h1>
          <span className="contents-meta">{metaLine(project)}</span>
        </header>
        <div className="contents-bar">
          <h2>{t("Innehåll")}</h2>
          <OrderSwitch isTimeOrder={isTimeOrder} onChange={setTimeOrder} />
        </div>
        {rows.length === 0 && <p className="contents-empty">{t("Inga kapitel än.")}</p>}
        <div className="contents-list">
          {shown.map((row) => (
            <Row key={row.id} {...props} row={row} drag={isTimeOrder ? drag : null} />
          ))}
        </div>
      </div>
    </main>
  );
}
