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
import type { ProjectChange } from "../labels/LabelsDialog.js";
import { filteredTree, labelsOn } from "../../project/labels.js";
import { t } from "../../i18n/i18n.js";

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
  onOpenBeside: (id: string) => void;
  onAdd: (kind: NodeKind, placement: Placement) => void;
  onNewNote: (sortId: string | null) => void;
  onMoveToSeries?: (id: string) => void;
  canMergeOpenScene?: boolean;
  onMergeWithNext?: () => void;
  /** The tree and project.json's fields changed together, as labels do. */
  onUpdateProject?: (change: ProjectChange) => void;
}

export type Actions = ReturnType<typeof useTreeActions>;
type MenuState = { items: MenuItem[]; x: number; y: number } | null;
export type View = ReturnType<typeof useTreeViewState>;

function useRenameRequest(props: TreeViewProps, view: View) {
  const { renameRequestId, project } = props;
  const { expand, setRenamingId } = view;
  const handledId = useRef<string | null>(null);
  useEffect(() => {
    if (!renameRequestId || handledId.current === renameRequestId) return;
    // The tree may not hold the new node yet; the effect runs again when it does.
    if (!findNode(project.tree, renameRequestId)) return;
    handledId.current = renameRequestId;
    expand(ancestorIds(project.tree, renameRequestId));
    setRenamingId(renameRequestId);
  }, [renameRequestId, project.tree, expand, setRenamingId]);
}

// The sorts and Papperskorg start folded; the book starts open.
function useCollapsed(tree: TreeNode[]) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(
    () => new Set([...sortsOf(tree).map((sort) => sort.id), TRASH_ID]),
  );
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
  const foldAll = () => setCollapsed(new Set([...foldableIds(tree), TRASH_ID]));
  const unfoldAll = () => setCollapsed(new Set([TRASH_ID]));
  return { collapsed, toggle, expand, foldAll, unfoldAll };
}

function useTreeViewState(tree: TreeNode[]) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuState>(null);
  const [labelsFor, setLabelsFor] = useState<string | null>(null);
  const [filter, setFilter] = useState<string[]>([]);
  const editing = { renamingId, setRenamingId, menu, setMenu, labelsFor, setLabelsFor };
  return { ...useCollapsed(tree), ...editing, filter, setFilter };
}

const foldableIds = (nodes: TreeNode[]): string[] =>
  nodes.flatMap((node) => (node.children?.length ? [node.id, ...foldableIds(node.children)] : []));

// Wherever a scene was opened from, the tree unfolds to it and shows it.
function useFollowOpenScene(props: TreeViewProps, view: View) {
  const { openSceneId, project } = props;
  const { expand } = view;
  const treeRef = useRef(project.tree);
  treeRef.current = project.tree;
  useEffect(() => {
    if (!openSceneId) return;
    expand(ancestorIds(treeRef.current, openSceneId));
    requestAnimationFrame(() =>
      document
        .querySelectorAll(".tree-row.active")
        .forEach((row) => row.scrollIntoView({ block: "nearest" })),
    );
  }, [openSceneId, expand]);
}

export function menuActions(actions: Actions, props: TreeViewProps, view: View): TreeMenuActions {
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
    openBeside: (node) => props.onOpenBeside(node.id),
    linkOf: (node) => noteLinkOf(props.project, node.id),
    setLink: (node, isLinked) => props.onSetNoteLink(node.id, isLinked),
    newNote: props.onNewNote,
    moveToSeries: props.onMoveToSeries ? (node) => props.onMoveToSeries?.(node.id) : null,
    canMerge: (node) =>
      props.canMergeOpenScene === true &&
      node.id === props.openSceneId &&
      noteLinkOf(props.project, node.id) === null,
    mergeWithNext: () => props.onMergeWithNext?.(),
    editLabels: props.onUpdateProject ? (node) => view.setLabelsFor(node.id) : null,
  };
}

// Null for anything that is not a note.
function noteLinkOf(project: Project, id: string) {
  const parent = findNode(project.tree, id)?.parent;
  if (parent?.kind !== "sort") return null;
  return project.summaries[id]?.link ?? isLinkedByDefault(parent.id);
}

export function useTreeView(props: TreeViewProps) {
  const { project } = props;
  const view = useTreeViewState(project.tree);
  useRenameRequest(props, view);
  useFollowOpenScene(props, view);
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
  const isFiltered = view.filter.length > 0;
  const rows = isFiltered
    ? visibleRows(filteredTree(project.tree, view.filter), new Set())
    : visibleRows(project.tree, view.collapsed);
  const sections = sidebarSections(rows);
  return { view, actions, drag, sections, dropAtBookEnd, openMenu, isFiltered };
}

export type Tree = ReturnType<typeof useTreeView>;

// An empty sort has nothing to unfold, so a click starts its first note.
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

// Labels and word counts change with the book, not with each key typed, so they are kept per
// version of the project; a long book has hundreds of rows to name.
const labelCache = new WeakMap<Project, Map<string, { label: string; meta: string }>>();

function labelsOf(project: Project, node: TreeNode) {
  const labels = labelCache.get(project) ?? new Map<string, { label: string; meta: string }>();
  labelCache.set(project, labels);
  const known = labels.get(node.id);
  if (known) return known;
  const made = {
    label: nodeLabel(node, project.tree, project.summaries),
    meta: nodeMeta(node, project.summaries),
  };
  labels.set(node.id, made);
  return made;
}

export function rowView(row: Row, props: TreeViewProps, collapsed: ReadonlySet<string>) {
  const { node } = row;
  const summary = props.project.summaries[node.id];
  const isInCloud = props.project.notDownloaded.some((file) => file.sceneId === node.id);
  const { label, meta } = labelsOf(props.project, node);
  return {
    row,
    label: isInCloud ? t("Hämtar från molnet…") : label,
    title: node.kind === "scene" ? (summary?.title ?? "") : (node.title ?? ""),
    meta,
    dots: labelsOn(props.project.fields, node),
    isActive: node.id === props.openSceneId,
    isExpanded: node.kind === "scene" ? null : !collapsed.has(node.id),
    isMissing: node.kind === "scene" && !summary,
  };
}
