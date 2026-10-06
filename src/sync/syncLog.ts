import type { TreeNode } from "../project/tree.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "../storage/fileSystem.js";
import { flatten, same, type TreeConflict } from "./mergeTree.js";

// What the syncs brought here from Drive, kept in the book until the writer has looked:
// texts that came, changed or went, the structure's changes, and its conflicts to choose.

export const SYNC_LOG = ".penna-sync-log.json";

export interface FileChange {
  /** Such as "scenes/S1.md" or "bilder/karta.png". */
  path: string;
  kind: "added" | "changed" | "removed";
  /** The text here before and after; null for a picture, or for a side that had none. */
  before: string | null;
  after: string | null;
  /** Where a removed file was put, so it can be put back. */
  trashPath?: string;
}

export type NodeFields = Omit<TreeNode, "children">;

export interface NodeChange {
  kind: "added" | "removed" | "moved" | "changed";
  node: NodeFields;
  field?: string;
  before?: unknown;
  after?: unknown;
}

export interface NodeConflict extends TreeConflict {
  node: NodeFields;
}

export interface SyncLog {
  files: FileChange[];
  nodes: NodeChange[];
  conflicts: NodeConflict[];
}

export const emptyLog = (): SyncLog => ({ files: [], nodes: [], conflicts: [] });
const isEmptyLog = (log: SyncLog) =>
  log.files.length + log.nodes.length + log.conflicts.length === 0;

const isLogged = (path: string) => /^(scenes|bilder)\//.test(path);
const textOf = (path: string, bytes: Uint8Array | undefined) =>
  bytes && path.endsWith(".md") ? new TextDecoder().decode(bytes) : null;
const treeIn = (bytes: Uint8Array | undefined): TreeNode[] => {
  try {
    const tree: unknown = JSON.parse(new TextDecoder().decode(bytes))?.tree;
    return Array.isArray(tree) ? (tree as TreeNode[]) : [];
  } catch {
    return [];
  }
};

/** How the structure went from one tree to the other, node by node. */
export function treeChanges(before: TreeNode[], after: TreeNode[]): NodeChange[] {
  const [was, now] = [flatten(before).nodes, flatten(after).nodes];
  const changes: NodeChange[] = [];
  for (const [id, { fields }] of was) {
    if (!now.has(id)) changes.push({ kind: "removed", node: fields });
  }
  for (const [id, placed] of now) {
    const earlier = was.get(id);
    if (!earlier) {
      changes.push({ kind: "added", node: placed.fields });
      continue;
    }
    if (earlier.parent !== placed.parent) changes.push({ kind: "moved", node: placed.fields });
    const read = (fields: NodeFields, field: string) => (fields as Record<string, unknown>)[field];
    for (const field of new Set([...Object.keys(earlier.fields), ...Object.keys(placed.fields)])) {
      const [old, fresh] = [read(earlier.fields, field), read(placed.fields, field)];
      if (same(old, fresh)) continue;
      changes.push({ kind: "changed", node: placed.fields, field, before: old, after: fresh });
    }
  }
  return changes;
}

function writtenProject(
  log: SyncLog,
  was: Uint8Array | undefined,
  now: Uint8Array,
  conflicts: TreeConflict[],
) {
  log.nodes.push(...treeChanges(treeIn(was), treeIn(now)));
  const nodes = flatten(treeIn(now)).nodes;
  for (const conflict of conflicts) {
    const node = nodes.get(conflict.id)?.fields ?? { id: conflict.id, kind: "scene" };
    log.conflicts.push({ ...conflict, node });
  }
}

/** Filled during one sync. */
export function syncLogger() {
  const log = emptyLog();
  return {
    log,
    written(
      path: string,
      was: Uint8Array | undefined,
      now: Uint8Array,
      conflicts: TreeConflict[] = [],
    ) {
      if (path === "project.json") return writtenProject(log, was, now, conflicts);
      if (!isLogged(path)) return;
      const kind = was ? "changed" : "added";
      log.files.push({ path, kind, before: textOf(path, was), after: textOf(path, now) });
    },
    trashed(path: string, was: Uint8Array, trashPath: string) {
      if (isLogged(path)) {
        log.files.push({
          path,
          kind: "removed",
          before: textOf(path, was),
          after: null,
          trashPath,
        });
      }
    },
  };
}

export type SyncLogger = ReturnType<typeof syncLogger>;

export async function readSyncLog(fileSystem: FileSystem, dir: string): Promise<SyncLog> {
  const text = await readIfThere(fileSystem, joinPath(dir, SYNC_LOG)).catch(() => null);
  try {
    return text ? { ...emptyLog(), ...(JSON.parse(text) as Partial<SyncLog>) } : emptyLog();
  } catch {
    return emptyLog();
  }
}

export const writeSyncLog = (fileSystem: FileSystem, dir: string, log: SyncLog) =>
  writeAtomic(fileSystem, joinPath(dir, SYNC_LOG), `${JSON.stringify(log, null, 2)}\n`);

// A file changed twice since the writer looked shows once, from first to last.
function mergedFiles(older: FileChange[], newer: FileChange[]) {
  const byPath = new Map(older.map((change) => [change.path, change]));
  for (const change of newer) {
    const first = byPath.get(change.path);
    if (!first) byPath.set(change.path, change);
    // Came and went again: it was never here before, so there is nothing to show.
    else if (first.kind === "added" && change.kind === "removed") byPath.delete(change.path);
    else {
      const kind = first.kind === "added" ? "added" : change.kind;
      byPath.set(change.path, { ...change, kind, before: first.before });
    }
  }
  return [...byPath.values()];
}

/** Adds one sync's changes to what is waiting; a newer conflict on the same field replaces it. */
export async function addToSyncLog(fileSystem: FileSystem, dir: string, fresh: SyncLog) {
  if (isEmptyLog(fresh)) return;
  const waiting = await readSyncLog(fileSystem, dir);
  const key = (conflict: TreeConflict) => `${conflict.id} ${conflict.field}`;
  const replaced = new Set(fresh.conflicts.map(key));
  await writeSyncLog(fileSystem, dir, {
    files: mergedFiles(waiting.files, fresh.files),
    nodes: [...waiting.nodes, ...fresh.nodes],
    conflicts: [
      ...waiting.conflicts.filter((conflict) => !replaced.has(key(conflict))),
      ...fresh.conflicts,
    ],
  });
}
