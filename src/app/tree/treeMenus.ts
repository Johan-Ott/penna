import { isSpecialFolder, TRASH_ID, type NodeKind, type TreeNode } from "../../project/tree.js";
import { SCENE_STATUSES, type SceneStatus } from "../../manuscript/sceneFile.js";
import type { MenuItem } from "../Menu.js";
import { t } from "../../i18n/i18n.js";

export const STATUS_LABELS: Record<SceneStatus, string> = {
  idé: t("Idé"),
  utkast: t("Utkast"),
  redigering: t("Redigering"),
  klar: t("Klar"),
};

/** Null leaves the place to the app. */
export type Placement = { inside: string } | { after: string } | null;

export interface TreeMenuActions {
  open: (node: TreeNode) => void;
  add: (kind: NodeKind, placement: Placement) => void;
  rename: (node: TreeNode) => void;
  trash: (node: TreeNode) => void;
  restore: (node: TreeNode) => void;
  setStatus: (node: TreeNode, status: SceneStatus) => void;
  statusOf: (node: TreeNode) => SceneStatus | null;
  showSnapshots: (node: TreeNode) => void;
  /** Shows the text beside the one being written. */
  openBeside: (node: TreeNode) => void;
  /** Null when the node is not a note. */
  linkOf: (node: TreeNode) => boolean | null;
  setLink: (node: TreeNode, isLinked: boolean) => void;
  newNote: (sortId: string) => void;
  /** Null when the book is in no series. */
  moveToSeries: ((node: TreeNode) => void) | null;
  canMerge: (node: TreeNode) => boolean;
  mergeWithNext: () => void;
  /** Null where the book's labels cannot be changed. */
  editLabels: ((node: TreeNode) => void) | null;
}

export function foldMenu(view: { foldAll: () => void; unfoldAll: () => void }): MenuItem[] {
  return [
    { label: t("Fäll ihop alla"), onSelect: view.foldAll, separatorBefore: true },
    { label: t("Fäll ut alla"), onSelect: view.unfoldAll },
  ];
}

export function addMenu(actions: Pick<TreeMenuActions, "add">): MenuItem[] {
  return [
    { label: t("Ny scen"), shortcut: "Ctrl+Alt+N", onSelect: () => actions.add("scene", null) },
    { label: t("Nytt kapitel"), onSelect: () => actions.add("chapter", null) },
    { label: t("Ny del"), onSelect: () => actions.add("part", null) },
    { label: t("Ny mapp"), onSelect: () => actions.add("folder", null) },
  ];
}

function newItemsFor(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  // A note is a scene on disk, but a new scene or chapter after it makes no sense.
  if (actions.linkOf(node) !== null) return [];
  const inside = { inside: node.id };
  const after = { after: node.id };
  const item = (label: string, kind: NodeKind, placement: Placement): MenuItem => ({
    label,
    onSelect: () => actions.add(kind, placement),
  });
  const byKind: Record<NodeKind, MenuItem[]> = {
    scene: [
      item(t("Ny scen efter"), "scene", after),
      item(t("Nytt kapitel efter"), "chapter", after),
    ],
    chapter: [
      item(t("Ny scen i kapitlet"), "scene", inside),
      item(t("Nytt kapitel efter"), "chapter", after),
    ],
    part: [
      item(t("Ny scen i delen"), "scene", inside),
      item(t("Nytt kapitel i delen"), "chapter", inside),
    ],
    folder: [
      item(t("Ny scen i mappen"), "scene", inside),
      item(t("Ny mapp i mappen"), "folder", inside),
    ],
    sort: [{ label: t("Ny anteckning"), onSelect: () => actions.newNote(node.id) }],
  };
  return byKind[node.kind];
}

// A note has no status; its menu chooses whether its name is linked instead.
function noteItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] | null {
  const isLinked = actions.linkOf(node);
  if (isLinked === null) return null;
  const { moveToSeries } = actions;
  return [
    {
      label: t("Koppla namnet i texten"),
      isChecked: isLinked,
      separatorBefore: true,
      onSelect: () => actions.setLink(node, !isLinked),
    },
    ...(moveToSeries
      ? [{ label: t("Flytta till serien"), onSelect: () => moveToSeries(node) }]
      : []),
  ];
}

// The status is written to the scene file and drives the progress on the shelf.
function statusItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  if (node.kind !== "scene") return [];
  const forNote = noteItems(node, actions);
  if (forNote) return forNote;
  const current = actions.statusOf(node);
  return SCENE_STATUSES.map((status, index) => ({
    label: t("Status: {status}", { status: STATUS_LABELS[status] }),
    isChecked: status === current,
    separatorBefore: index === 0,
    onSelect: () => actions.setStatus(node, status),
  }));
}

// Up and down among its siblings, where dragging is no way to move it, as on a phone.
function moveItems(move: ((step: 1 | -1) => void) | undefined): MenuItem[] {
  if (!move) return [];
  return [
    { label: t("Flytta upp"), shortcut: "Alt+↑", separatorBefore: true, onSelect: () => move(-1) },
    { label: t("Flytta ned"), shortcut: "Alt+↓", onSelect: () => move(1) },
  ];
}

function editItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  const { editLabels } = actions;
  return [
    ...(editLabels
      ? [{ label: t("Labels…"), separatorBefore: true, onSelect: () => editLabels(node) }]
      : []),
    {
      label: t("Byt namn"),
      shortcut: "F2",
      separatorBefore: !editLabels,
      onSelect: () => actions.rename(node),
    },
    {
      label: t("Flytta till papperskorg"),
      shortcut: "Delete",
      onSelect: () => actions.trash(node),
    },
  ];
}

export function rowMenu(
  node: TreeNode,
  isInTrash: boolean,
  actions: TreeMenuActions,
  move?: (step: 1 | -1) => void,
): MenuItem[] {
  if (node.id === TRASH_ID) return [];
  if (isInTrash)
    return [{ label: t("Lägg tillbaka i manuset"), onSelect: () => actions.restore(node) }];
  const added = newItemsFor(node, actions);
  if (isSpecialFolder(node.id)) return added;
  const open =
    node.kind === "scene"
      ? [
          { label: t("Öppna"), onSelect: () => actions.open(node) },
          { label: t("Öppna bredvid"), onSelect: () => actions.openBeside(node) },
          { label: t("Versioner…"), onSelect: () => actions.showSnapshots(node) },
          ...(actions.canMerge(node)
            ? [{ label: t("Slå ihop med nästa scen"), onSelect: actions.mergeWithNext }]
            : []),
        ]
      : [];
  const [firstAdded, ...restAdded] = added;
  const separatedAdd =
    firstAdded && open.length > 0
      ? [{ ...firstAdded, separatorBefore: true }, ...restAdded]
      : added;
  const status = statusItems(node, actions);
  return [...open, ...separatedAdd, ...status, ...moveItems(move), ...editItems(node, actions)];
}
