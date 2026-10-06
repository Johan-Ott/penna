import { moveToTrash, type TreeNode } from "../../project/tree.js";
import { writeAtomic } from "../../storage/atomicWrite.js";
import { joinPath, readIfThere } from "../../storage/fileSystem.js";
import type { FileChange, NodeChange } from "../../sync/syncLog.js";
import { platform } from "../platform.js";
import { checkDisk, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

// Taking back what the sync brought: the text, title or file is as it was here before. The
// next sync then sends that to Drive, so the other device gets it back too.

export interface TakeBackParts {
  project: Project;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
}

export function withField(tree: TreeNode[], id: string, field: string, value: unknown): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, [field]: value } as TreeNode;
    return node.children ? { ...node, children: withField(node.children, id, field, value) } : node;
  });
}

const sceneIdOf = (path: string) => /^scenes\/([^/]+)\.md$/.exec(path)?.[1] ?? null;

/** Whether there is an earlier version here to go back to. */
export function canTakeBack(change: FileChange | NodeChange) {
  if ("path" in change) {
    if (change.kind === "removed") return Boolean(change.trashPath);
    if (change.kind === "added") return sceneIdOf(change.path) !== null;
    return change.before !== null;
  }
  return change.kind === "changed" && change.field !== undefined;
}

// Back where it was, unless a file of that name has come since.
async function putBack(dir: string, change: FileChange) {
  const to = joinPath(dir, change.path);
  if (change.trashPath && (await readIfThere(platform.fileSystem, to)) === null)
    await platform.fileSystem.rename(joinPath(dir, change.trashPath), to);
}

async function takeBackFile(parts: TakeBackParts, change: FileChange) {
  const { project } = parts;
  const sceneId = sceneIdOf(change.path);
  if (change.kind === "removed") return putBack(project.dir, change);
  // A new scene goes to Penna's own trash, where it can still be found.
  if (change.kind === "added")
    return sceneId ? parts.updateTree(moveToTrash(project.tree, sceneId)) : undefined;
  if (change.before === null) return;
  await writeAtomic(platform.fileSystem, joinPath(project.dir, change.path), change.before);
  await checkDisk(parts.session);
}

export async function takeBack(parts: TakeBackParts, change: FileChange | NodeChange) {
  if ("path" in change) return takeBackFile(parts, change);
  const { node, field, before } = change;
  if (field) await parts.updateTree(withField(parts.project.tree, node.id, field, before));
}
