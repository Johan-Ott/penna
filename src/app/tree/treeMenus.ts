import { isSpecialFolder, TRASH_ID, type NodeKind, type TreeNode } from "../../project/tree.js";
import type { MenuItem } from "../Menu.js";

/** Where a new node goes: inside a node (at its end), after a node, or as chosen by the app. */
export type Placement = { inside: string } | { after: string } | null;

export interface TreeMenuActions {
  open: (node: TreeNode) => void;
  add: (kind: NodeKind, placement: Placement) => void;
  rename: (node: TreeNode) => void;
  trash: (node: TreeNode) => void;
  restore: (node: TreeNode) => void;
}

/** The add button and a right-click on empty space offer the same four things. */
export function addMenu(actions: Pick<TreeMenuActions, "add">): MenuItem[] {
  return [
    { label: "Ny scen", shortcut: "Ctrl+Alt+N", onSelect: () => actions.add("scene", null) },
    { label: "Nytt kapitel", onSelect: () => actions.add("chapter", null) },
    { label: "Ny del", onSelect: () => actions.add("part", null) },
    { label: "Ny mapp", onSelect: () => actions.add("folder", null) },
  ];
}

function newItemsFor(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  const inside = { inside: node.id };
  const after = { after: node.id };
  const item = (label: string, kind: NodeKind, placement: Placement): MenuItem => ({
    label,
    onSelect: () => actions.add(kind, placement),
  });
  const byKind: Record<NodeKind, MenuItem[]> = {
    scene: [item("Ny scen efter", "scene", after), item("Nytt kapitel efter", "chapter", after)],
    chapter: [
      item("Ny scen i kapitlet", "scene", inside),
      item("Nytt kapitel efter", "chapter", after),
    ],
    part: [
      item("Ny scen i delen", "scene", inside),
      item("Nytt kapitel i delen", "chapter", inside),
    ],
    folder: [item("Ny scen i mappen", "scene", inside), item("Ny mapp i mappen", "folder", inside)],
  };
  return byKind[node.kind];
}

function editItems(node: TreeNode, actions: TreeMenuActions): MenuItem[] {
  return [
    {
      label: "Byt namn",
      shortcut: "F2",
      separatorBefore: true,
      onSelect: () => actions.rename(node),
    },
    { label: "Flytta till papperskorg", shortcut: "Delete", onSelect: () => actions.trash(node) },
  ];
}

/** Everything a right-click on a tree row can do, grouped: open, add, edit. */
export function rowMenu(node: TreeNode, isInTrash: boolean, actions: TreeMenuActions): MenuItem[] {
  if (node.id === TRASH_ID) return [];
  if (isInTrash)
    return [{ label: "Lägg tillbaka i manuset", onSelect: () => actions.restore(node) }];
  const added = newItemsFor(node, actions);
  if (isSpecialFolder(node.id)) return added;
  const open =
    node.kind === "scene" ? [{ label: "Öppna", onSelect: () => actions.open(node) }] : [];
  const [firstAdded, ...restAdded] = added;
  const separatedAdd =
    firstAdded && open.length > 0
      ? [{ ...firstAdded, separatorBefore: true }, ...restAdded]
      : added;
  return [...open, ...separatedAdd, ...editItems(node, actions)];
}
