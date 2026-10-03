import { useState } from "react";
import { listSnapshots, type SceneRef, type Snapshot } from "../../project/snapshots.js";
import { platform } from "../platform.js";
import { openScene, type SceneSession } from "../sceneSession.js";
import { restoreSnapshot, takeManualSnapshot } from "../snapshotActions.js";
import type { Project } from "../useProject.js";

/** "now" is the scene as it is in the editor; otherwise the file name of a snapshot. */
export type SnapshotChoice = "now" | string;

/** The snapshot dialog's state: which scene, its snapshots, and which one is being compared. */
export function useSnapshots(project: Project | null, session: SceneSession) {
  const [scene, setScene] = useState<SceneRef | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [chosen, setChosen] = useState<SnapshotChoice>("now");
  const reload = async (ref: SceneRef) => {
    setChosen("now");
    setSnapshots(await listSnapshots(platform.fileSystem, ref));
  };
  // The dialog compares with the open scene, so a scene picked in the tree is opened first.
  const show = async (id: string) => {
    if (!project) return;
    if (session.scene?.id !== id && !(await openScene(session, project.dir, id))) return;
    setScene({ dir: project.dir, id });
    await reload({ dir: project.dir, id });
  };
  const afterwards = (action: (ref: SceneRef) => Promise<unknown>) => {
    if (scene) void action(scene).then(() => reload(scene));
  };
  return {
    sceneId: scene?.id ?? null,
    snapshots,
    chosen,
    choose: setChosen,
    show: (id: string) => void show(id),
    take: (label: string) => afterwards((ref) => takeManualSnapshot(session, ref, label)),
    restore: (snapshot: Snapshot) =>
      afterwards((ref) => restoreSnapshot(session, ref, snapshot, Date.now())),
    close: () => setScene(null),
  };
}
