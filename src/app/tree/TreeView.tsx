import type { DragEvent, ReactNode } from "react";
import { findNode, type TreeNode } from "../../project/tree.js";
import { visibleRows, withoutEmptySorts, type TreeRow as Row } from "../../project/treeRows.js";
import { Menu } from "../Menu.js";
import { addMenu, foldMenu, rowMenu } from "./treeMenus.js";
import { TreeRow } from "./TreeRow.js";
import {
  isEmptySort,
  menuActions,
  rowHandlers,
  rowView,
  useTreeView,
  type Tree,
  type TreeViewProps,
} from "./useTreeView.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { LabelsDialog } from "../labels/LabelsDialog.js";
import { numberLocale, t } from "../../i18n/i18n.js";

export type { TreeViewProps } from "./useTreeView.js";

function menuOf(row: Row, tree: Tree, menuFor: ReturnType<typeof menuActions>) {
  const { actions } = tree;
  const isInTrash = actions.isInTrash(row.node.id);
  const canMove = actions.canEdit(row.node) && !isInTrash;
  const move = canMove ? (step: 1 | -1) => actions.moveBy(row, step) : undefined;
  return rowMenu(row.node, isInTrash, menuFor, move);
}

function Rows({ rows, props, tree }: { rows: Row[]; props: TreeViewProps; tree: Tree }) {
  const { view, actions, drag, openMenu } = tree;
  const menuFor = menuActions(actions, props, view);
  return rows.map((row) => (
    <TreeRow
      key={row.node.id}
      {...rowView(row, props, view.collapsed)}
      isRenaming={view.renamingId === row.node.id}
      dropHint={drag.dropHintFor(row.node.id)}
      dragProps={drag.rowDragProps(row, actions.canEdit(row.node))}
      {...rowHandlers(row, actions, view)}
      {...(isEmptySort(row.node) ? { onActivate: () => props.onNewNote(row.node.id) } : {})}
      onContextMenu={(event) => openMenu(event, menuOf(row, tree, menuFor))}
    />
  ));
}

function SectionHeading(props: { label: string; onDrop?: () => void; words?: number }) {
  return (
    <div
      role="none"
      className="sidebar-heading"
      onDragOver={(event: DragEvent) => props.onDrop && event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), props.onDrop?.())}
    >
      {props.label}
      {props.words !== undefined && (
        <span className="sidebar-heading-words" aria-label={t("Ord i boken")}>
          {props.words.toLocaleString(numberLocale())}
        </span>
      )}
    </div>
  );
}

// The book's own sorts only show when they hold something.
function BookNotes({ props, tree }: { props: TreeViewProps & BookExtras; tree: Tree }) {
  if (!props.seriesNotes) {
    return (
      <>
        <SectionHeading label={t("Anteckningar")} />
        <Rows rows={tree.sections.notes} props={props} tree={tree} />
      </>
    );
  }
  const own = withoutEmptySorts(tree.sections.notes);
  return (
    <>
      {props.seriesNotes}
      {own.length > 0 && <SectionHeading label={t("Bara i den här boken")} />}
      <Rows rows={own} props={props} tree={tree} />
    </>
  );
}

interface BookExtras {
  /** On a phone the notes are tiles of their own. */
  isBookOnly?: boolean;
  seriesNotes?: ReactNode;
}

function NotesAndTrash({ props, tree }: { props: TreeViewProps & BookExtras; tree: Tree }) {
  return (
    <>
      <BookNotes props={props} tree={tree} />
      <button className="tree-add" onClick={() => props.onNewNote(null)}>
        {t("+ Ny anteckning")}
      </button>
      <div className="tree-bottom">
        <Rows rows={tree.sections.trash} props={props} tree={tree} />
      </div>
    </>
  );
}

// On a phone: adding is a button, not a right click, and the trash stays in reach.
function BookOnlyEnd({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const menuFor = menuActions(tree.actions, props, tree.view);
  return (
    <>
      <button className="tree-add" onClick={(event) => tree.openMenu(event, addMenu(menuFor))}>
        {t("+ Lägg till")}
      </button>
      <div className="tree-bottom">
        <Rows rows={tree.sections.trash} props={props} tree={tree} />
      </div>
    </>
  );
}

/** One tree, so the arrow keys walk through all of it. */
export function TreeView(props: TreeViewProps & BookExtras) {
  const tree = useTreeView(props);
  const { sections, view } = tree;
  const menuFor = menuActions(tree.actions, props, tree.view);
  return (
    <div
      role="tree"
      aria-label={t("Boken")}
      className="tree"
      onContextMenu={(event) => tree.openMenu(event, [...addMenu(menuFor), ...foldMenu(view)])}
    >
      <SectionHeading
        label={t("Boken")}
        onDrop={tree.dropAtBookEnd}
        words={manuscriptWords(props.project.tree, props.project.summaries)}
      />
      <Rows rows={sections.book} props={props} tree={tree} />
      {props.isBookOnly ? (
        <BookOnlyEnd props={props} tree={tree} />
      ) : (
        <NotesAndTrash props={props} tree={tree} />
      )}
      {view.menu && <Menu {...view.menu} label={t("Boken")} onClose={() => view.setMenu(null)} />}
      <LabelsLayer props={props} view={view} />
    </div>
  );
}

function LabelsLayer({ props, view }: { props: TreeViewProps; view: Tree["view"] }) {
  const { labelsFor, setLabelsFor } = view;
  if (!labelsFor || !props.onUpdateProject) return null;
  return (
    <LabelsDialog
      project={props.project}
      nodeId={labelsFor}
      onUpdate={props.onUpdateProject}
      onClose={() => setLabelsFor(null)}
    />
  );
}

/** The series' Papperskorg shows only once something is in it. */
export function SeriesNotes(props: TreeViewProps & { name: string }) {
  const tree = useTreeView(props);
  const { sections, view } = tree;
  const hasTrash = (sections.trash[0]?.node.children ?? []).length > 0;
  const trash = hasTrash ? sections.trash : [];
  return (
    <div role="group" aria-label={props.name} onContextMenu={(event) => event.stopPropagation()}>
      <SectionHeading label={t("Anteckningar · {name}", { name: props.name })} />
      <Rows rows={sections.notes} props={props} tree={tree} />
      <Rows rows={trash} props={props} tree={tree} />
      {view.menu && <Menu {...view.menu} label={props.name} onClose={() => view.setMenu(null)} />}
    </div>
  );
}

// The notes inside one sort, even when the sort is folded up in the sidebar.
function rowsUnder(tree: TreeNode[], sortId: string, collapsed: ReadonlySet<string>) {
  const sort = findNode(tree, sortId)?.node;
  return sort ? visibleRows(sort.children ?? [], collapsed, 0, sortId) : [];
}

/** One sort's notes with their menus, as on a phone's screen for that sort. */
export function SortNotes(props: TreeViewProps & { sortId: string; name: string }) {
  const tree = useTreeView(props);
  const { view } = tree;
  return (
    <div role="tree" aria-label={props.name} className="tree">
      <Rows
        rows={rowsUnder(props.project.tree, props.sortId, view.collapsed)}
        props={props}
        tree={tree}
      />
      {view.menu && <Menu {...view.menu} label={props.name} onClose={() => view.setMenu(null)} />}
    </div>
  );
}
