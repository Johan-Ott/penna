import { findNode, type TreeNode } from "./tree.js";

/** One of the book's own labels, kept in project.json and put on nodes in the tree. */
export interface Label {
  id: string;
  name: string;
  color: string;
}

export const LABEL_COLORS = [
  "#d4483b",
  "#e08a1e",
  "#c9a400",
  "#3f9a4f",
  "#2f86c9",
  "#7a5cc9",
  "#c9508f",
  "#7d7d7d",
];

const isLabel = (value: unknown): value is Label => {
  const label = value as Partial<Label> | null;
  return (
    typeof label?.id === "string" &&
    typeof label.name === "string" &&
    typeof label.color === "string"
  );
};

export function labelsOf(fields: Record<string, unknown>): Label[] {
  const stored = fields["labels"];
  return Array.isArray(stored) ? stored.filter(isLabel) : [];
}

/** The labels on a node, in the book's order of labels. */
export const labelsOn = (fields: Record<string, unknown>, node: TreeNode) =>
  node.labels?.length ? labelsOf(fields).filter((label) => node.labels?.includes(label.id)) : [];

const mapNode = (tree: TreeNode[], id: string, change: (node: TreeNode) => TreeNode): TreeNode[] =>
  tree.map((node) => {
    if (node.id === id) return change(node);
    return node.children ? { ...node, children: mapNode(node.children, id, change) } : node;
  });

// A node without labels has no `labels` at all, so project.json stays as it was.
function withLabelIds(node: TreeNode, labels: string[]): TreeNode {
  const copy = { ...node };
  if (labels.length > 0) copy.labels = labels;
  else delete copy.labels;
  return copy;
}

/** Puts the label on the node, or takes it off. */
export function withLabel(tree: TreeNode[], nodeId: string, labelId: string, isOn: boolean) {
  return mapNode(tree, nodeId, (node) => {
    const others = (node.labels ?? []).filter((id) => id !== labelId);
    return withLabelIds(node, isOn ? [...others, labelId] : others);
  });
}

/** Takes a removed label off every node. */
export function withoutLabel(tree: TreeNode[], labelId: string): TreeNode[] {
  return tree.map((node) => {
    const kept = withLabelIds(
      node,
      (node.labels ?? []).filter((id) => id !== labelId),
    );
    return node.children ? { ...kept, children: withoutLabel(node.children, labelId) } : kept;
  });
}

export const hasLabel = (tree: TreeNode[], nodeId: string, labelId: string) =>
  findNode(tree, nodeId)?.node.labels?.includes(labelId) ?? false;

/** What each side added stays and what either took off goes, so two devices never conflict. */
export function mergeLabelIds(base: string[] = [], here: string[] = [], drive: string[] = []) {
  const removed = new Set(base.filter((id) => !here.includes(id) || !drive.includes(id)));
  return [...new Set([...here, ...drive])].filter((id) => !removed.has(id));
}

/** Only the nodes with one of the labels, and what they lie in, so the book's shape still shows. */
export function filteredTree(tree: TreeNode[], labelIds: string[]): TreeNode[] {
  return tree.flatMap((node) => {
    const children = node.children && filteredTree(node.children, labelIds);
    const isLabelled = node.labels?.some((id) => labelIds.includes(id)) ?? false;
    if (!isLabelled && !children?.length) return [];
    return [children ? { ...node, children } : node];
  });
}
