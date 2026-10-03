import { useEffect, useRef, useState, type DragEvent, type MouseEvent } from "react";
import {
  ancestorIds,
  findNode,
  isSpecialFolder,
  manuscriptSceneIds,
  moveNode,
  RESEARCH_ID,
  TRASH_ID,
  visibleRows,
  type NodeKind,
  type TreeNode,
  type TreeRow as Row,
} from "../../project/tree.js";
import { nodeLabel, nodeMeta, shortWordCount } from "../../project/treeLabels.js";
import { Menu, type MenuItem } from "../Menu.js";
import type { Project } from "../useProject.js";
import { Chevron } from "./Chevron.js";
import { addMenu, rowMenu, type Placement, type TreeMenuActions } from "./treeMenus.js";
import { TreeRow } from "./TreeRow.js";
import { useTreeActions } from "./useTreeActions.js";
import { useTreeDrag } from "./useTreeDrag.js";

export interface TreeViewProps {
  project: Project;
  openSceneId: string | null;
  /** A node just created; the tree shows it and starts renaming it. */
  renameRequestId: string | null;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onRenameScene: (id: string, title: string) => void;
  onAdd: (kind: NodeKind, placement: Placement) => void;
}

type Actions = ReturnType<typeof useTreeActions>;
type MenuState = { items: MenuItem[]; x: number; y: number } | null;

function ManuscriptRow({ project, onDropHere }: { project: Project; onDropHere: () => void }) {
  const sceneWords = manuscriptSceneIds(project.tree).map(
    (id) => project.summaries[id]?.words ?? 0,
  );
  const words = sceneWords.reduce((sum, count) => sum + count, 0);
  return (
    <div
      className="tree-row manuscript-row"
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), onDropHere())}
    >
      <span className="tree-chevron">
        <Chevron isOpen />
      </span>
      <span className="tree-label">Manus</span>
      <span className="tree-meta">{shortWordCount(words)}</span>
    </div>
  );
}

// Manuscript rows sit one step in under the Manus row; Research and Papperskorg do not.
function displayDepths(rows: Row[]) {
  let isInSpecialFolder = false;
  return rows.map((row) => {
    if (row.depth === 0) isInSpecialFolder = isSpecialFolder(row.node.id);
    return isInSpecialFolder ? row.depth : row.depth + 1;
  });
}

// A newly created node is shown, with its parents opened, and its name is ready to type.
function useRenameRequest(
  props: TreeViewProps,
  view: { expand: (ids: string[]) => void; setRenamingId: (id: string) => void },
) {
  const { renameRequestId, project } = props;
  const { expand, setRenamingId } = view;
  const handledId = useRef<string | null>(null);
  useEffect(() => {
    if (!renameRequestId || handledId.current === renameRequestId) return;
    // The tree state may not hold the new node yet; the effect runs again when it does.
    if (!findNode(project.tree, renameRequestId)) return;
    handledId.current = renameRequestId;
    expand(ancestorIds(project.tree, renameRequestId));
    setRenamingId(renameRequestId);
  }, [renameRequestId, project.tree, expand, setRenamingId]);
}

function useTreeViewState() {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set([RESEARCH_ID, TRASH_ID]),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const [expand] = useState(
    () => (ids: string[]) =>
      setCollapsed((current) => new Set([...current].filter((id) => !ids.includes(id)))),
  );
  return { collapsed, toggle, expand, renamingId, setRenamingId, menu, setMenu };
}

function menuActions(actions: Actions, props: TreeViewProps): TreeMenuActions {
  return {
    open: (node) => actions.activate(node),
    add: props.onAdd,
    rename: (node) => actions.startRename(node),
    trash: (node) => actions.trash(node),
    restore: (node) => actions.restore(node),
  };
}

function useTreeView(props: TreeViewProps) {
  const { project } = props;
  const view = useTreeViewState();
  useRenameRequest(props, view);
  const actions = useTreeActions({
    ...props,
    tree: project.tree,
    ...view,
    startRename: view.setRenamingId,
  });
  const drag = useTreeDrag(project.tree, props.onChangeTree);
  const rows = visibleRows(project.tree, view.collapsed);
  const dropAtManuscriptEnd = () => {
    if (drag.draggedId)
      props.onChangeTree(moveNode(project.tree, drag.draggedId, null, Number.MAX_SAFE_INTEGER));
  };
  const openMenu = (event: MouseEvent, items: MenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    if (items.length > 0) view.setMenu({ items, x: event.clientX, y: event.clientY });
  };
  return { view, actions, drag, rows, depths: displayDepths(rows), dropAtManuscriptEnd, openMenu };
}

export function TreeView(props: TreeViewProps) {
  const { view, actions, drag, rows, depths, dropAtManuscriptEnd, openMenu } = useTreeView(props);
  const menuFor = menuActions(actions, props);
  return (
    <div
      role="tree"
      aria-label="Struktur"
      className="tree"
      onContextMenu={(event) => openMenu(event, addMenu(menuFor))}
    >
      <ManuscriptRow project={props.project} onDropHere={dropAtManuscriptEnd} />
      {rows.map((row, index) => (
        <TreeRow
          key={row.node.id}
          {...rowView(row, depths[index] ?? 0, props, view.collapsed)}
          isRenaming={view.renamingId === row.node.id}
          dropHint={drag.dropHintFor(row.node.id)}
          dragProps={drag.rowDragProps(row, actions.canEdit(row.node))}
          {...rowHandlers(row, actions, view)}
          onContextMenu={(event) =>
            openMenu(event, rowMenu(row.node, actions.isInTrash(row.node.id), menuFor))
          }
        />
      ))}
      {view.menu && <Menu {...view.menu} label="Struktur" onClose={() => view.setMenu(null)} />}
    </div>
  );
}

function rowHandlers(row: Row, actions: Actions, view: ReturnType<typeof useTreeViewState>) {
  return {
    onActivate: () => actions.activate(row.node),
    onToggle: () => view.toggle(row.node.id),
    onKeyDown: (event: Parameters<Actions["onKeyDown"]>[1]) => actions.onKeyDown(row, event),
    onStartRename: () => actions.startRename(row.node),
    onRename: (title: string | null) => {
      view.setRenamingId(null);
      if (title) actions.rename(row.node, title);
    },
  };
}

function rowView(row: Row, depth: number, props: TreeViewProps, collapsed: ReadonlySet<string>) {
  const { node } = row;
  const summary = props.project.summaries[node.id];
  return {
    row: { ...row, depth },
    label: nodeLabel(node, props.project.tree, props.project.summaries),
    title: node.kind === "scene" ? (summary?.title ?? "") : (node.title ?? ""),
    meta: nodeMeta(node, props.project.summaries),
    isActive: node.id === props.openSceneId,
    isExpanded: node.kind === "scene" ? null : !collapsed.has(node.id),
    isMissing: node.kind === "scene" && !summary,
  };
}
