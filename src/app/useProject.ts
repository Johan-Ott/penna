import { useCallback, useEffect, useRef, useState } from "react";
import { readProjectFile, writeProjectFile } from "../project/projectFile.js";
import { readSceneSummaries, type SceneSummary } from "../project/sceneSummaries.js";
import { reconcileScenes, type TreeNode } from "../project/tree.js";
import { openProjectFolder, type OpenedProject } from "../storage/projectFolder.js";
import { describeSaveError, type SaveFailure } from "../storage/saveError.js";
import { platform } from "./platform.js";

export interface Project extends OpenedProject {
  dir: string;
  name: string;
  fields: Record<string, unknown>;
  tree: TreeNode[];
  summaries: Record<string, SceneSummary>;
  repairCopy: string | null;
  /** Saved by a newer Penna: nothing is written, so its project.json is never downgraded. */
  isReadOnly: boolean;
}

const folderName = (dir: string) => (dir.split("/").pop() ?? dir).replace(/\.penna$/, "");

async function readProject(dir: string): Promise<Project> {
  const fileSystem = platform.fileSystem;
  const listing = await openProjectFolder(fileSystem, dir);
  const file = await readProjectFile(fileSystem, dir, listing.scenes);
  const { tree } = reconcileScenes(file.tree, listing.scenes);
  const summaries = await readSceneSummaries(fileSystem, dir, listing.scenes);
  const title = file.fields["title"];
  const name = typeof title === "string" ? title : folderName(dir);
  return {
    ...listing,
    dir,
    name,
    fields: file.fields,
    tree,
    summaries,
    repairCopy: file.repairCopy,
    isReadOnly: file.isNewerFormat,
  };
}

// project.json is written one change at a time, so an older version never lands after a newer.
function useProjectWriter(projectRef: React.RefObject<Project | null>) {
  const [treeFailure, setTreeFailure] = useState<SaveFailure | null>(null);
  const queue = useRef(Promise.resolve());
  const write = useCallback(
    (fields: Record<string, unknown>, tree: TreeNode[]) => {
      const project = projectRef.current;
      if (!project) return Promise.resolve();
      queue.current = queue.current
        .then(() => writeProjectFile(platform.fileSystem, project.dir, fields, tree))
        .then(() => setTreeFailure(null))
        .catch((error: unknown) => setTreeFailure(describeSaveError(error)));
      return queue.current;
    },
    [projectRef],
  );
  return { write, treeFailure };
}

// The tree and the other fields of project.json change on screen at once and are then written.
function useProjectUpdates(
  projectRef: React.RefObject<Project | null>,
  setProject: React.Dispatch<React.SetStateAction<Project | null>>,
) {
  const { write, treeFailure } = useProjectWriter(projectRef);
  const update = useCallback(
    (change: { tree?: TreeNode[]; fields?: Record<string, unknown> }) => {
      const project = projectRef.current;
      if (!project || project.isReadOnly) return Promise.resolve();
      const tree = change.tree ?? project.tree;
      const fields = { ...project.fields, ...change.fields };
      setProject((current) => current && { ...current, tree, fields });
      return write(fields, tree);
    },
    [projectRef, setProject, write],
  );
  const updateTree = useCallback((tree: TreeNode[]) => update({ tree }), [update]);
  const updateFields = useCallback(
    (fields: Record<string, unknown>) => update({ fields }),
    [update],
  );
  return { updateTree, updateFields, treeFailure };
}

/** The project folder the writer picked, read again whenever something in it changes. */
export function useProject(onFolderChange: () => void) {
  const [project, setProject] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;
  const updates = useProjectUpdates(projectRef, setProject);
  const dir = project?.dir ?? null;

  const open = useCallback(async (folder: string) => setProject(await readProject(folder)), []);
  const refresh = useCallback(async () => {
    if (dir) setProject(await readProject(dir));
  }, [dir]);
  const choose = useCallback(async () => {
    const folder = await platform.pickFolder();
    if (folder) await open(folder);
  }, [open]);
  useFolderWatch(dir, refresh, onFolderChange);
  const close = useCallback(() => setProject(null), []);
  return { project, open, close, choose, refresh, ...updates };
}

function useFolderWatch(dir: string | null, refresh: () => Promise<void>, onChange: () => void) {
  useEffect(() => {
    if (!dir) return;
    const stopWatching = platform.watchFolder(dir, () => {
      void refresh();
      onChange();
    });
    return () => void stopWatching.then((stop) => stop());
  }, [dir, refresh, onChange]);
}
