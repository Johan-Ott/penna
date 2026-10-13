import { newSceneId } from "../storage/sceneId.js";
import { LABEL_COLORS, labelsOf, withLabel, type Label } from "./labels.js";
import { findNode, type TreeNode } from "./tree.js";

// Labels put on and taken off by name, as the tree's menus do.

export interface BookParts {
  fields: Record<string, unknown>;
  tree: TreeNode[];
}

const sameName = (one: string, other: string) =>
  one.trim().toLowerCase() === other.trim().toLowerCase();

function newLabel(labels: Label[], name: string, color?: string): Label {
  const nextColor = LABEL_COLORS[labels.length % LABEL_COLORS.length] ?? "#7d7d7d";
  return { id: newSceneId(), name: name.trim(), color: color ?? nextColor };
}

/** Puts a label on a node by its name, or takes it off; a new name makes a new label. */
export function withNamedLabel(book: BookParts, nodeId: string, name: string, isOn: boolean) {
  if (!findNode(book.tree, nodeId)) throw new Error(`Det finns ingen del med id ${nodeId}.`);
  const labels = labelsOf(book.fields);
  const found = labels.find((label) => sameName(label.name, name));
  if (!found && !isOn) return book;
  const label = found ?? newLabel(labels, name);
  return {
    fields: { ...book.fields, labels: found ? labels : [...labels, label] },
    tree: withLabel(book.tree, nodeId, label.id, isOn),
  };
}
