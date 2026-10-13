import { newSceneId } from "../storage/sceneId.js";
import { LABEL_COLORS, labelsOf, withLabel, type Label } from "./labels.js";
import { composeTemplate, structures, templatePieces } from "./templates.js";
import { findNode, sortsOf, withSpecialFolders, type TreeNode } from "./tree.js";

// Labels and pieces changed in a book that already exists, as the tree's menus and Ny bok do.

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

function piecesTemplate(pieceIds: string[]) {
  const known = templatePieces().map((piece) => piece.id);
  const unknown = pieceIds.filter((id) => !known.includes(id));
  if (unknown.length > 0)
    throw new Error(
      `Det finns ingen bit som heter ${unknown.join(", ")}. Bitarna: ${known.join(", ")}.`,
    );
  const empty = structures().find((structure) => structure.id === "tom") ?? structures()[0];
  if (!empty) throw new Error("Penna saknar sina bokmallar.");
  return composeTemplate(empty, pieceIds);
}

/** The pieces' note sorts and labels added to the book; what it already has is kept as it is. */
export function withPieces(book: BookParts, pieceIds: string[]): BookParts {
  const ids = pieceIds
    .flatMap((id) => id.split(","))
    .map((id) => id.trim())
    .filter(Boolean);
  const template = piecesTemplate(ids);
  const labels = labelsOf(book.fields);
  const sortTitles = sortsOf(book.tree).map((sort) => sort.title ?? "");
  const addedLabels = template.labels
    .filter(([name = ""]) => !labels.some((label) => sameName(label.name, name)))
    .map(([name = "", color]) => newLabel(labels, name, color));
  const addedSorts: TreeNode[] = template.sorts
    .filter((title) => !sortTitles.some((existing) => sameName(existing, title)))
    .map((title) => ({ id: newSceneId(), kind: "sort", title, children: [] }));
  const fields = addedLabels.length
    ? { ...book.fields, labels: [...labels, ...addedLabels] }
    : book.fields;
  return { fields, tree: withSpecialFolders([...book.tree, ...addedSorts]) };
}
