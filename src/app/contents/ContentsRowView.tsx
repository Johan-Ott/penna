import { SCENE_STATUSES, type SceneStatus } from "../../manuscript/sceneFile.js";
import { useState } from "react";
import { withNodeText, type ContentsRow } from "../../project/contents.js";
import { findNode, type TreeNode } from "../../project/tree.js";
import { ChapterHeadingDialog } from "./ChapterHeadingDialog.js";
import { useMenuButton, type MenuItem } from "../Menu.js";
import { statusSteps } from "../../project/statusSteps.js";
import { labelsWithin } from "../../project/labels.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

export interface RowProps {
  project: Project;
  row: ContentsRow;
  /** The chapter's pages in the printed book, once they are counted. */
  pages: { first: number; last: number } | null;
  dragProps: object;
  /** Faded by the filter: it holds nothing asked for. */
  isDimmed?: boolean;
  /** A scene's own row under its unfolded chapter. */
  isScene?: boolean;
  /** A chapter folds out to its scenes. */
  fold?: { isOpen: boolean; onToggle: () => void } | undefined;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onSetStatus: (sceneIds: string[], status: SceneStatus) => void;
}

const format = (count: number) => count.toLocaleString(numberLocale());

// Saves when the field is left, not on every key.
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

const StatusDot = ({ step }: { step: { color: string } }) => (
  <span className={`tree-dot${step.color ? "" : " outlined"}`} style={{ background: step.color }} />
);

// The chapter's own labels and its scenes', so the plan shows what each chapter holds.
function RowLabels({ project, row }: RowProps) {
  const node = findNode(project.tree, row.id)?.node;
  const labels = node ? labelsWithin(project.fields, node) : [];
  if (labels.length === 0) return null;
  return (
    <span className="contents-labels">
      {labels.map((label) => (
        <span key={label.id} className="contents-label">
          <StatusDot step={label} /> {label.name}
        </span>
      ))}
    </span>
  );
}

function StatusButton(props: RowProps) {
  const { row } = props;
  const items: MenuItem[] = SCENE_STATUSES.map((status) => ({
    label: statusSteps(props.project.fields)[status].name,
    isChecked: status === row.status,
    onSelect: () => props.onSetStatus(row.sceneIds, status),
  }));
  const menu = useMenuButton(t("Status"), items);
  const step = statusSteps(props.project.fields)[row.status];
  return (
    <>
      <button
        className="contents-status"
        aria-label={t("Status: {step}", { step: step.name })}
        title={step.name}
        onClick={menu.open}
      >
        <StatusDot step={step} />
      </button>
      {menu.menu}
    </>
  );
}

function RowTitle(props: { row: ContentsRow; onOpenScene: (id: string) => void }) {
  const { row } = props;
  const firstScene = row.sceneIds[0];
  return (
    <button className="contents-title" onClick={() => firstScene && props.onOpenScene(firstScene)}>
      {row.number === null ? row.title : `${row.number}. ${row.title}`}
    </button>
  );
}

// The chapter's subtitle when it has one; otherwise a quiet way into the heading's settings.
function HeadingButton(props: RowProps) {
  const { row, project } = props;
  const [isOpen, setOpen] = useState(false);
  const subtitle = findNode(project.tree, row.id)?.node.subtitle;
  const name = `${row.number ?? ""}. ${row.title}`;
  return (
    <>
      <button
        className={subtitle ? "contents-heading" : "contents-heading quiet"}
        onClick={() => setOpen(true)}
      >
        {subtitle ?? t("Rubrik…")}
      </button>
      {isOpen && (
        <ChapterHeadingDialog
          project={project}
          chapterId={row.id}
          chapterName={name}
          onChangeTree={props.onChangeTree}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const FoldButton = ({ fold, title }: { fold: NonNullable<RowProps["fold"]>; title: string }) => (
  <button
    className={fold.isOpen ? "contents-fold open" : "contents-fold"}
    aria-expanded={fold.isOpen}
    aria-label={t("Scener i {chapter}", { chapter: title })}
    onClick={fold.onToggle}
  >
    ›
  </button>
);

function TitleLine(props: RowProps) {
  return (
    <span className="contents-title-line">
      {props.fold && <FoldButton fold={props.fold} title={props.row.title} />}
      <RowTitle row={props.row} onOpenScene={props.onOpenScene} />
      {props.row.number !== null && <HeadingButton {...props} />}
    </span>
  );
}

function pageText(pages: RowProps["pages"]) {
  if (!pages) return "";
  return pages.first === pages.last
    ? t("s. {page}", { page: pages.first })
    : t("s. {first}–{last}", { first: pages.first, last: pages.last });
}

/** One chapter in Innehåll: its title, what happens, when, its length and its status. */
const WordsCell = ({ row, pages }: RowProps) => (
  <span className="contents-words">
    {row.words > 0 ? format(row.words) : ""}
    {pages && <span className="contents-pages">{pageText(pages)}</span>}
  </span>
);

// Whose eyes and when, each in its own narrow column.
const SHORT_FIELDS: ["pov" | "when", string][] = [
  ["pov", t("Vems ögon?")],
  ["when", t("När?")],
];

const rowClass = ({ isDimmed, isScene }: RowProps) =>
  ["contents-row", isScene && "scene", isDimmed && "dimmed"].filter(Boolean).join(" ");

export function Row(props: RowProps) {
  const { row, project } = props;
  const save = (field: "summary" | "when" | "pov") => (text: string) =>
    props.onChangeTree(withNodeText(project.tree, row.id, field, text));
  return (
    <div className={rowClass(props)} {...props.dragProps}>
      <StatusButton {...props} />
      <div className="contents-main">
        <TitleLine {...props} />
        <InlineText
          value={row.summary}
          label={t("Vad händer?")}
          className="contents-summary"
          onSave={save("summary")}
        />
        <RowLabels {...props} />
      </div>
      {SHORT_FIELDS.map(([field, label]) => (
        <InlineText
          key={field}
          value={row[field]}
          label={label}
          className={`contents-${field}`}
          onSave={save(field)}
        />
      ))}
      <WordsCell {...props} />
    </div>
  );
}
