import type { DragEvent, ReactNode } from "react";
import { withoutEmptySorts, type TreeRow as Row } from "../../project/treeRows.js";
import { Menu } from "../Menu.js";
import { addMenu, rowMenu } from "./treeMenus.js";
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
import { t } from "../../i18n/i18n.js";

export type { TreeViewProps } from "./useTreeView.js";

export function Rows({ rows, props, tree }: { rows: Row[]; props: TreeViewProps; tree: Tree }) {
  const { view, actions, drag, openMenu } = tree;
  const menuFor = menuActions(actions, props);
  return rows.map((row) => (
    <TreeRow
      key={row.node.id}
      {...rowView(row, props, view.collapsed)}
      isRenaming={view.renamingId === row.node.id}
      dropHint={drag.dropHintFor(row.node.id)}
      dragProps={drag.rowDragProps(row, actions.canEdit(row.node))}
      {...rowHandlers(row, actions, view)}
      {...(isEmptySort(row.node) ? { onActivate: () => props.onNewNote(row.node.id) } : {})}
      onContextMenu={(event) =>
        openMenu(event, rowMenu(row.node, actions.isInTrash(row.node.id), menuFor))
      }
    />
  ));
}

export function SectionHeading(props: { label: string; onDrop?: () => void }) {
  return (
    <div
      role="none"
      className="sidebar-heading"
      onDragOver={(event: DragEvent) => props.onDrop && event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), props.onDrop?.())}
    >
      {props.label}
    </div>
  );
}

// In a book of a series the series' notes come first; the book's own sorts only show when
// they hold something.
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
  /** Only Boken, as the phone shows it; its notes are tiles of their own there. */
  isBookOnly?: boolean;
  /** The series' notes, shown in place of the book's own when the book is in a series. */
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

/** Boken, Anteckningar and Papperskorg: one tree, so the arrow keys walk through all of it. */
export function TreeView(props: TreeViewProps & BookExtras) {
  const tree = useTreeView(props);
  const { sections, view } = tree;
  const menuFor = menuActions(tree.actions, props);
  return (
    <div
      role="tree"
      aria-label={t("Boken")}
      className="tree"
      onContextMenu={(event) => tree.openMenu(event, addMenu(menuFor))}
    >
      <SectionHeading label={t("Boken")} onDrop={tree.dropAtBookEnd} />
      <Rows rows={sections.book} props={props} tree={tree} />
      {!props.isBookOnly && <NotesAndTrash props={props} tree={tree} />}
      {view.menu && <Menu {...view.menu} label={t("Boken")} onClose={() => view.setMenu(null)} />}
    </div>
  );
}

/** The series' sorts inside the book's sidebar; its Papperskorg only once something is in it. */
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
