import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  ancestorIds,
  findNode,
  moveNode,
  sortsOf,
  TRASH_ID,
  type NodeKind,
  type TreeNode,
} from "../../project/tree.js";
import { sidebarSections, visibleRows, type TreeRow as Row } from "../../project/treeRows.js";
import type { SceneStatus } from "../../manuscript/sceneFile.js";
import { nodeLabel, nodeMeta } from "../../project/treeLabels.js";
import { isLinkedByDefault } from "../../project/cards.js";
import type { MenuItem } from "../Menu.js";
import type { Project } from "../useProject.js";
import type { Placement, TreeMenuActions } from "./treeMenus.js";
import { useTreeActions } from "./useTreeActions.js";
import { useTreeDrag } from "./useTreeDrag.js";
import { t } from "../../i18n/i18n.js";

/** What a tree is given: the book's or the series' project, and what its rows can do. */
export interface TreeViewProps {
  project: Project;
  openSceneId: string | null;
  /** A node just created; the tree shows it and starts renaming it. */
  renameRequestId: string | null;
  onOpenScene: (id: string) => void;
  onChangeTree: (tree: TreeNode[]) => void;
  onRenameScene: (id: string, title: string) => void;
  onSetSceneStatus: (id: string, status: SceneStatus) => void;
  onSetNoteLink: (id: string, isLinked: boolean) => void;
  onShowSnapshots: (id: string) => void;
  onAdd: (kind: NodeKind, placement: Placement) => void;
  /** Ny anteckning, with a sort already chosen or not. */
  onNewNote: (sortId: string | null) => void;
  /** Moves a book's note into its series, when the book is in one. */
  onMoveToSeries?: (id: string) => void;
  /** Slå ihop med nästa scen, for the open scene when a scene follows it. */
  canMergeOpenScene?: boolean;
  onMergeWithNext?: () => void;
}

export type Actions = ReturnType<typeof useTreeActions>;
type MenuState = { items: MenuItem[]; x: number; y: number } | null;
export type View = ReturnType<typeof useTreeViewState>;

// A newly created node is shown, with its parents opened, and its name is ready to type.
function useRenameRequest(props: TreeViewProps, view: View) {
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

// The sorts and Papperskorg start folded, as in the design; the book starts open.
function useTreeViewState(tree: TreeNode[]) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set([...sortsOf(tree).map((sort) => sort.id), TRASH_ID]),
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

export function menuActions(actions: Actions, props: TreeViewProps): TreeMenuActions {
  const { summaries } = props.project;
  return {
    open: (node) => actions.activate(node),
    add: props.onAdd,
    rename: (node) => actions.startRename(node),
    trash: (node) => actions.trash(node),
    restore: (node) => actions.restore(node),
    setStatus: (node, status) => props.onSetSceneStatus(node.id, status),
    statusOf: (node) => summaries[node.id]?.status ?? null,
    showSnapshots: (node) => props.onShowSnapshots(node.id),
    linkOf: (node) => noteLinkOf(props.project, node.id),
    setLink: (node, isLinked) => props.onSetNoteLink(node.id, isLinked),
    newNote: props.onNewNote,
    moveToSeries: props.onMoveToSeries ? (node) => props.onMoveToSeries?.(node.id) : null,
    canMerge: (node) => props.canMergeOpenScene === true && node.id === props.openSceneId,
    mergeWithNext: () => props.onMergeWithNext?.(),
  };
}

// Whether a note's name is linked in the text; null for anything that is not a note.
function noteLinkOf(project: Project, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  if (parent?.kind !== "sort") return null;
  return project.summaries[id]?.link ?? isLinkedByDefault(parent.id);
}

export function useTreeView(props: TreeViewProps) {
  const { project } = props;
  const view = useTreeViewState(project.tree);
  useRenameRequest(props, view);
  const actions = useTreeActions({
    ...props,
    tree: project.tree,
    ...view,
    startRename: view.setRenamingId,
  });
  const drag = useTreeDrag(project.tree, props.onChangeTree);
  const dropAtBookEnd = () => {
    if (drag.draggedId)
      props.onChangeTree(moveNode(project.tree, drag.draggedId, null, Number.MAX_SAFE_INTEGER));
  };
  const openMenu = (event: MouseEvent, items: MenuItem[]) => {
    event.preventDefault();
    event.stopPropagation();
    if (items.length > 0) view.setMenu({ items, x: event.clientX, y: event.clientY });
  };
  const sections = sidebarSections(visibleRows(project.tree, view.collapsed));
  return { view, actions, drag, sections, dropAtBookEnd, openMenu };
}

export type Tree = ReturnType<typeof useTreeView>;

// An empty sort has nothing to unfold; a click starts its first note instead.
export const isEmptySort = (node: TreeNode) => node.kind === "sort" && !node.children?.length;

export function rowHandlers(row: Row, actions: Actions, view: View) {
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

export function rowView(row: Row, props: TreeViewProps, collapsed: ReadonlySet<string>) {
  const { node } = row;
  const summary = props.project.summaries[node.id];
  const isInCloud = props.project.notDownloaded.some((file) => file.sceneId === node.id);
  return {
    row,
    label: isInCloud
      ? t("Hämtar från molnet…")
      : nodeLabel(node, props.project.tree, props.project.summaries),
    title: node.kind === "scene" ? (summary?.title ?? "") : (node.title ?? ""),
    meta: nodeMeta(node, props.project.summaries),
    isActive: node.id === props.openSceneId,
    isExpanded: node.kind === "scene" ? null : !collapsed.has(node.id),
    isMissing: node.kind === "scene" && !summary,
  };
}
