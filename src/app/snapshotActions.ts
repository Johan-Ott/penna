import { joinSceneFile, splitSceneFile } from "../manuscript/sceneFile.js";
import { takeSnapshot, type SceneRef, type Snapshot } from "../project/snapshots.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath } from "../storage/fileSystem.js";
import { openScene, type SceneSession } from "./sceneSession.js";

/**
 * Puts a snapshot's text back. What is there now is snapshotted first, as the spec asks, and
 * the scene keeps its current title and status.
 */
export async function restoreSnapshot(
  session: SceneSession,
  scene: SceneRef,
  snapshot: Snapshot,
  time: number,
) {
  if (!(await session.autosave.flush())) return false;
  const path = joinPath(scene.dir, `scenes/${scene.id}.md`);
  const current = await session.fileSystem.readText(path);
  await takeSnapshot(session.fileSystem, scene, current, { time, label: "Före återställning" });
  const { frontMatter } = splitSceneFile(current);
  await writeAtomic(session.fileSystem, path, joinSceneFile({ frontMatter, body: snapshot.body }));
  if (session.scene?.dir === scene.dir && session.scene.id === scene.id) {
    await openScene(session, scene.dir, scene.id);
  }
  return true;
}

/** A manual snapshot of the scene as saved, after the open scene's text is on disk. */
export async function takeManualSnapshot(session: SceneSession, scene: SceneRef, label: string) {
  if (!(await session.autosave.flush())) return;
  const text = await session.fileSystem.readText(joinPath(scene.dir, `scenes/${scene.id}.md`));
  await takeSnapshot(session.fileSystem, scene, text, { time: Date.now(), label: label.trim() });
}
