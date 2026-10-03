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
  };
}

// Tree changes are written one at a time, so an older order never lands after a newer one.
function useTreeWriter(projectRef: React.RefObject<Project | null>) {
  const [treeFailure, setTreeFailure] = useState<SaveFailure | null>(null);
  const queue = useRef(Promise.resolve());
  const writeTree = useCallback(
    (tree: TreeNode[]) => {
      const project = projectRef.current;
      if (!project) return Promise.resolve();
      queue.current = queue.current
        .then(() => writeProjectFile(platform.fileSystem, project.dir, project.fields, tree))
        .then(() => setTreeFailure(null))
        .catch((error: unknown) => setTreeFailure(describeSaveError(error)));
      return queue.current;
    },
    [projectRef],
  );
  return { writeTree, treeFailure };
}

/** The project folder the writer picked, read again whenever something in it changes. */
export function useProject(onFolderChange: () => void) {
  const [project, setProject] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);
  projectRef.current = project;
  const { writeTree, treeFailure } = useTreeWriter(projectRef);
  const dir = project?.dir ?? null;

  const open = useCallback(async (folder: string) => setProject(await readProject(folder)), []);
  const refresh = useCallback(async () => {
    if (dir) setProject(await readProject(dir));
  }, [dir]);
  const choose = useCallback(async () => {
    const folder = await platform.pickFolder();
    if (folder) await open(folder);
  }, [open]);
  const updateTree = useCallback(
    (tree: TreeNode[]) => {
      setProject((current) => current && { ...current, tree });
      return writeTree(tree);
    },
    [writeTree],
  );
  useFolderWatch(dir, refresh, onFolderChange);
  const close = useCallback(() => setProject(null), []);
  return { project, open, close, choose, refresh, updateTree, treeFailure };
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
