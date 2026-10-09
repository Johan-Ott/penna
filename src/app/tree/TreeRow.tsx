import { useState, type DragEvent, type KeyboardEvent, type MouseEvent } from "react";
import type { DropPosition, TreeRow as Row } from "../../project/treeRows.js";
import type { Label } from "../../project/labels.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import { Chevron } from "./Chevron.js";
import type { StatusStep } from "../../project/statusSteps.js";
import { t } from "../../i18n/i18n.js";

export interface TreeRowProps {
  row: Row;
  label: string;
  /** Without numbering. */
  title: string;
  meta: string;
  /** The row's labels, shown as dots in their colours. */
  dots: Label[];
  /** A scene's step, as a dot before its labels; null for anything else. */
  status: (StatusStep & { id: SceneStatus }) | null;
  isActive: boolean;
  /** In a table of contents, the printed page it starts on; undefined when the sidebar is not one. */
  page?: number | null | undefined;
  isExpanded: boolean | null;
  isRenaming: boolean;
  isMissing: boolean;
  dropHint: DropPosition | null;
  dragProps: {
    draggable: boolean;
    onDragStart: (event: DragEvent<HTMLElement>) => void;
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
  onActivate: () => void;
  onToggle: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onStartRename: () => void;
  onRename: (title: string | null) => void;
}

function RenameInput({
  initial,
  onRename,
}: {
  initial: string;
  onRename: (title: string | null) => void;
}) {
  const [value, setValue] = useState(initial);
  const finish = (title: string | null) => onRename(title?.trim() ? title.trim() : null);
  return (
    <input
      className="tree-rename"
      aria-label={t("Nytt namn")}
      autoFocus
      // The old name is chosen, so typing replaces it, as in any file manager.
      onFocus={(event) => event.target.select()}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(value);
        if (event.key === "Escape") finish(null);
        event.stopPropagation();
      }}
    />
  );
}

const rowClass = (props: TreeRowProps) =>
  [
    "tree-row",
    props.row.depth === 0 ? "top-level" : "",
    props.isActive ? "active" : "",
    props.status?.id === "idé" ? "planned" : "",
    props.isMissing ? "missing" : "",
    props.page !== undefined ? "toc" : "",
    props.dropHint ? `drop-${props.dropHint}` : "",
  ]
    .filter(Boolean)
    .join(" ");

const treeItemAttributes = (props: TreeRowProps) => ({
  role: "treeitem",
  tabIndex: 0,
  "aria-level": props.row.depth + 1,
  "aria-expanded": props.isExpanded ?? undefined,
  "aria-current": props.isActive ? ("page" as const) : undefined,
});

// The row's menu for a tap, where there is no right click.
const MoreButton = (props: { label: string; onOpen: (event: MouseEvent<HTMLElement>) => void }) => (
  <button
    className="tree-more"
    aria-label={t("Meny för {name}", { name: props.label })}
    onClick={(event) => (event.stopPropagation(), props.onOpen(event))}
  >
    ⋯
  </button>
);

// A scene's step stands before its name, as the design draws it; an idea is only an outline.
function StatusDot({ status }: { status: TreeRowProps["status"] }) {
  if (!status) return null;
  return (
    <span
      className={`tree-dot tree-status${status.color ? "" : " outlined"}`}
      title={status.name}
      aria-label={status.name}
      style={{ background: status.color }}
    />
  );
}

function LabelDots({ dots }: { dots: Label[] }) {
  if (dots.length === 0) return null;
  return (
    <span className="tree-dots" aria-label={dots.map((dot) => dot.name).join(", ")}>
      {dots.map((dot) => (
        <span
          key={dot.id}
          className="tree-dot"
          title={dot.name}
          style={{ background: dot.color }}
        />
      ))}
    </span>
  );
}

// Dots to the page number, as a printed table of contents lines them up.
const PageLeader = ({ page }: { page: number | null }) => (
  <>
    <span className="tree-leader" aria-hidden="true" />
    <span className="tree-page">{page ?? ""}</span>
  </>
);

// The words, or in a table of contents the page; then the menu for a tap.
const RowEnd = (props: TreeRowProps) => (
  <>
    {props.page === undefined ? (
      <span className="tree-meta">{props.meta}</span>
    ) : (
      <PageLeader page={props.page} />
    )}
    <MoreButton label={props.label} onOpen={props.onContextMenu} />
  </>
);

export function TreeRow(props: TreeRowProps) {
  return (
    <div
      {...treeItemAttributes(props)}
      className={rowClass(props)}
      style={{ paddingLeft: 10 + props.row.depth * 14 }}
      onClick={props.onActivate}
      onDoubleClick={props.onStartRename}
      onKeyDown={props.onKeyDown}
      onContextMenu={props.onContextMenu}
      {...props.dragProps}
    >
      <span
        className="tree-chevron"
        onClick={(event) => (event.stopPropagation(), props.onToggle())}
      >
        {props.isExpanded !== null && <Chevron isOpen={props.isExpanded} />}
      </span>
      <StatusDot status={props.status} />
      {props.isRenaming ? (
        <RenameInput initial={props.title} onRename={props.onRename} />
      ) : (
        <span className="tree-label">{props.label}</span>
      )}
      <LabelDots dots={props.dots} />
      <RowEnd {...props} />
    </div>
  );
}
