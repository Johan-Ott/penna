import type { TreeNode } from "../project/tree.js";

// Each part, chapter and scene is merged on its own, by id, against the last sync. The same
// field changed two ways is a conflict: this device's value stays, the other is handed back.

type Fields = Omit<TreeNode, "children">;

interface Placed {
  fields: Fields;
  parent: string;
  hasChildren: boolean;
}

interface Flat {
  nodes: Map<string, Placed>;
  /** Children in order, by parent id; "" is the top of the tree. */
  order: Map<string, string[]>;
}

export interface TreeConflict {
  id: string;
  field: string;
  here: unknown;
  drive: unknown;
}

const TOP = "";
export const same = (one: unknown, other: unknown) => JSON.stringify(one) === JSON.stringify(other);

export function flatten(
  tree: TreeNode[],
  parent = TOP,
  flat: Flat = { nodes: new Map(), order: new Map() },
) {
  flat.order.set(
    parent,
    tree.map((node) => node.id),
  );
  for (const { children, ...fields } of tree) {
    flat.nodes.set(fields.id, { fields, parent, hasChildren: children !== undefined });
    if (children) flatten(children, fields.id, flat);
  }
  return flat;
}

/** The side that changed wins; both changed the same way is no conflict either. */
function pick<T>(base: T | undefined, here: T, drive: T) {
  if (same(here, drive) || same(drive, base)) return { value: here, isConflict: false };
  if (same(here, base)) return { value: drive, isConflict: false };
  return { value: here, isConflict: true };
}

function mergeFields(id: string, sides: (Fields | undefined)[], conflicts: TreeConflict[]) {
  const [base, here, drive] = sides;
  if (!here || !drive) return here ?? drive;
  const merged: Record<string, unknown> = { id };
  const keys = new Set([...Object.keys(here), ...Object.keys(drive), ...Object.keys(base ?? {})]);
  for (const field of keys) {
    const read = (fields: Fields | undefined) =>
      (fields as Record<string, unknown> | undefined)?.[field];
    const { value, isConflict } = pick(read(base), read(here), read(drive));
    if (isConflict) conflicts.push({ id, field, here: read(here), drive: read(drive) });
    if (value !== undefined) merged[field] = value;
  }
  return merged as Fields;
}

// Gone on one side and untouched on the other means removed; changed on the other means kept,
// since losing what someone wrote is worse than seeing a removed chapter again.
function isRemoved(id: string, base: Flat, here: Flat, drive: Flat) {
  const before = base.nodes.get(id);
  const [mine, theirs] = [here.nodes.get(id), drive.nodes.get(id)];
  if (!before || (mine && theirs)) return false;
  return same(mine ?? theirs, before);
}

// Right after the node it followed on its own side, or last when that one is elsewhere.
function insertBeside(order: string[], id: string, from: string[]) {
  const previous = from[from.indexOf(id) - 1];
  const index = previous === undefined ? 0 : order.indexOf(previous) + 1 || order.length;
  order.splice(index, 0, id);
}

/** Both sides, the missing one standing in for the other. */
const both = <T>(here: T | undefined, drive: T | undefined) => [here ?? drive, drive ?? here];

function orderUnder(parent: string, flats: Flat[], kept: Map<string, Placed>) {
  const [base, here, drive] = flats.map((flat) => flat.order.get(parent));
  const [mine = [], theirs = []] = both(here, drive);
  const order = pick(base, mine, theirs).value.filter((id) => kept.get(id)?.parent === parent);
  for (const [id, placed] of kept) {
    if (placed.parent === parent && !order.includes(id))
      insertBeside(order, id, theirs.includes(id) ? theirs : mine);
  }
  return order;
}

function build(parent: string, flats: Flat[], kept: Map<string, Placed>): TreeNode[] {
  return orderUnder(parent, flats, kept).flatMap((id) => {
    const placed = kept.get(id);
    if (!placed) return [];
    const children = build(id, flats, kept);
    const hasChildren = placed.hasChildren || children.length > 0;
    return [hasChildren ? { ...placed.fields, children } : placed.fields];
  });
}

function mergeNode(id: string, sides: (Placed | undefined)[], conflicts: TreeConflict[]) {
  const [base, here, drive] = sides;
  const [mine, theirs] = both(here, drive);
  if (!mine || !theirs) return undefined;
  const fields = mergeFields(
    id,
    sides.map((side) => side?.fields),
    conflicts,
  );
  const parent = pick(base?.parent, mine.parent, theirs.parent).value;
  return {
    fields: fields ?? mine.fields,
    parent,
    hasChildren: mine.hasChildren || theirs.hasChildren,
  };
}

export function mergeTrees(base: TreeNode[], here: TreeNode[], drive: TreeNode[]) {
  const flats = [flatten(base), flatten(here), flatten(drive)];
  const [baseFlat, hereFlat, driveFlat] = flats as [Flat, Flat, Flat];
  const conflicts: TreeConflict[] = [];
  const kept = new Map<string, Placed>();
  for (const id of new Set([...hereFlat.nodes.keys(), ...driveFlat.nodes.keys()])) {
    if (isRemoved(id, baseFlat, hereFlat, driveFlat)) continue;
    const placed = mergeNode(
      id,
      flats.map((flat) => flat.nodes.get(id)),
      conflicts,
    );
    if (placed) kept.set(id, placed);
  }
  // A node whose parent is gone sits at the top rather than vanishing.
  for (const placed of kept.values()) if (!kept.has(placed.parent)) placed.parent = TOP;
  return { tree: build(TOP, flats, kept), conflicts };
}
