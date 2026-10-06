import { useCallback, useEffect, useState } from "react";
import { insertAfter, type TreeNode } from "../../project/tree.js";
import { joinPath, readIfThere } from "../../storage/fileSystem.js";
import type { SceneFileRef } from "../../storage/syncFiles.js";
import {
  emptyLog,
  readSyncLog,
  writeSyncLog,
  type FileChange,
  type NodeChange,
  type NodeConflict,
  type SyncLog,
} from "../../sync/syncLog.js";
import { platform } from "../platform.js";
import type { ConflictChoice, SceneSession } from "../sceneSession.js";
import { keepVersion } from "../syncRepairs.js";
import type { Project } from "../useProject.js";

/** One row in the list: something to choose first, then what came from Drive. */
export type ReviewItem =
  | { key: string; kind: "copy"; copy: SceneFileRef }
  | { key: string; kind: "conflict"; conflict: NodeConflict }
  | { key: string; kind: "file"; change: FileChange }
  | { key: string; kind: "node"; change: NodeChange };

export function reviewItems(project: Project, log: SyncLog): ReviewItem[] {
  return [
    ...project.conflicts.map((copy) => ({ key: copy.fileName, kind: "copy" as const, copy })),
    ...log.conflicts.map((conflict) => ({
      key: `krock ${conflict.id} ${conflict.field}`,
      kind: "conflict" as const,
      conflict,
    })),
    ...log.files.map((change) => ({ key: change.path, kind: "file" as const, change })),
    ...log.nodes.map((change, index) => ({
      key: `nod ${index} ${change.node.id}`,
      kind: "node" as const,
      change,
    })),
  ];
}

function withField(tree: TreeNode[], id: string, field: string, value: unknown): TreeNode[] {
  return tree.map((node) => {
    if (node.id === id) return { ...node, [field]: value } as TreeNode;
    return node.children ? { ...node, children: withField(node.children, id, field, value) } : node;
  });
}

// Back where it was, unless a file of that name has come since.
async function putBackFile(dir: string, change: FileChange) {
  if (!change.trashPath) return;
  const to = joinPath(dir, change.path);
  if ((await readIfThere(platform.fileSystem, to)) === null)
    await platform.fileSystem.rename(joinPath(dir, change.trashPath), to);
}

interface ReviewParts {
  project: Project | null;
  session: SceneSession;
  updateTree: (tree: TreeNode[]) => Promise<void>;
  refresh: () => Promise<void>;
}

function useLog(project: Project | null) {
  const [log, setLog] = useState<SyncLog>(emptyLog);
  const dir = project?.dir;
  // Read again with every change to the book, since a sync is one.
  useEffect(() => {
    if (!dir) return setLog(emptyLog());
    void readSyncLog(platform.fileSystem, dir).then(setLog);
  }, [project, dir]);
  const save = useCallback(
    async (next: SyncLog) => {
      setLog(next);
      if (dir) await writeSyncLog(platform.fileSystem, dir, next);
    },
    [dir],
  );
  return { log, save };
}

/** The sync's changes and conflicts, and the choices made in the review. */
export function useSyncReview({ project, session, updateTree, refresh }: ReviewParts) {
  const [isOpen, setOpen] = useState(false);
  const { log, save } = useLog(project);
  const chooseNode = async (conflict: NodeConflict, isDrives: boolean) => {
    if (!project) return;
    if (isDrives)
      await updateTree(withField(project.tree, conflict.id, conflict.field, conflict.drive));
    await save({ ...log, conflicts: log.conflicts.filter((other) => other !== conflict) });
  };
  const chooseCopy = async (copy: SceneFileRef, choice: ConflictChoice) => {
    if (!project) return;
    const newId = await keepVersion(session, project.dir, copy, choice);
    if (newId)
      await updateTree(insertAfter(project.tree, { id: newId, kind: "scene" }, copy.sceneId));
    await refresh();
  };
  const putBack = async (change: FileChange) => {
    if (!project) return;
    await putBackFile(project.dir, change);
    await save({ ...log, files: log.files.filter((other) => other !== change) });
    await refresh();
  };
  // Seen: only the conflicts stay until they are chosen.
  const done = async () => {
    await save({ ...emptyLog(), conflicts: log.conflicts });
    setOpen(false);
  };
  const items = project ? reviewItems(project, log) : [];
  const actions = { chooseNode, chooseCopy, putBack, done };
  return { items, isOpen, open: () => setOpen(true), close: () => setOpen(false), ...actions };
}

export type SyncReview = ReturnType<typeof useSyncReview>;
