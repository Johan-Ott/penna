import type { Node } from "prosemirror-model";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import {
  joinSceneFile,
  newSceneText,
  sceneTitle,
  splitSceneFile,
  withSceneTitle,
} from "../manuscript/sceneFile.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { createAutosave, type SaveStatus } from "../storage/autosave.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { decideExternalChange } from "../storage/syncFiles.js";

export interface OpenScene {
  dir: string;
  id: string;
  frontMatter: string;
  title: string;
}

export interface DiskConflict {
  editorText: string;
  diskText: string;
}

export type ConflictChoice = "mine" | "theirs" | "both";

export interface SceneSessionHooks {
  editor: { load(doc: Node): void; currentDoc(): Node | null };
  onScene(scene: OpenScene | null): void;
  onConflict(conflict: DiskConflict | null): void;
  onSaveStatus(status: SaveStatus): void;
}

export interface SceneSession {
  fileSystem: FileSystem;
  hooks: SceneSessionHooks;
  autosave: ReturnType<typeof createAutosave>;
  scene: OpenScene | null;
}

const scenePath = (dir: string, id: string) => joinPath(dir, `scenes/${id}.md`);

const textOf = (session: SceneSession, doc: Node) =>
  joinSceneFile({ frontMatter: session.scene?.frontMatter ?? "", body: serializeMarkdown(doc) });

export function createSceneSession(fileSystem: FileSystem, hooks: SceneSessionHooks) {
  const current: { scene: OpenScene | null } = { scene: null };
  const autosave = createAutosave({
    write: async (text) => {
      const scene = current.scene;
      if (scene) await writeAtomic(fileSystem, scenePath(scene.dir, scene.id), text);
    },
    onStatus: hooks.onSaveStatus,
  });
  const session: SceneSession = Object.assign(current, { fileSystem, hooks, autosave });
  return session;
}

// Text typed with no scene open has nowhere to go, so the editor is read-only then.
export function sceneEdited(session: SceneSession, doc: Node) {
  if (session.scene) session.autosave.changed(textOf(session, doc));
}

/** Saves and closes the open scene. When saving fails the scene stays open and false comes back. */
export async function closeScene(session: SceneSession) {
  if (!(await session.autosave.flush())) return false;
  session.scene = null;
  session.autosave.loaded("");
  session.hooks.editor.load(parseMarkdown(""));
  session.hooks.onScene(null);
  session.hooks.onConflict(null);
  return true;
}

function showScene(session: SceneSession, dir: string, id: string, text: string) {
  const { frontMatter, body } = splitSceneFile(text);
  session.scene = { dir, id, frontMatter, title: sceneTitle(frontMatter) ?? "Namnlös scen" };
  session.hooks.onScene(session.scene);
  session.autosave.loaded(text);
  session.hooks.editor.load(parseMarkdown(body));
}

// Leaving a scene whose text is not on disk would lose that text, so the switch waits.
export async function openScene(session: SceneSession, dir: string, id: string) {
  if (!(await session.autosave.flush())) return false;
  const text = await session.fileSystem.readText(scenePath(dir, id));
  session.autosave.release();
  showScene(session, dir, id, text);
  session.hooks.onConflict(null);
  return true;
}

export async function checkDisk(session: SceneSession) {
  const scene = session.scene;
  const doc = session.hooks.editor.currentDoc();
  if (!scene || !doc) return;
  const diskText = await session.fileSystem
    .readText(scenePath(scene.dir, scene.id))
    .catch(() => null);
  if (diskText === null) return;
  const editorText = textOf(session, doc);
  const lastSavedText = session.autosave.lastSavedText();
  const decision = decideExternalChange({ diskText, editorText, lastSavedText });
  if (decision === "reload") showScene(session, scene.dir, scene.id, diskText);
  if (decision !== "conflict") return;
  session.autosave.hold();
  session.hooks.onConflict({ diskText, editorText });
}

/** Writes a new scene file and returns its id. */
export async function createScene(fileSystem: FileSystem, dir: string, title: string, body = "") {
  const id = newSceneId();
  await fileSystem.makeDir(joinPath(dir, "scenes"));
  await writeAtomic(fileSystem, scenePath(dir, id), newSceneText(id, title) + body);
  return id;
}

export async function resolveConflict(
  session: SceneSession,
  choice: ConflictChoice,
  conflict: DiskConflict,
) {
  const scene = session.scene;
  if (!scene) return;
  if (choice === "both") {
    const otherBody = splitSceneFile(conflict.diskText).body;
    await createScene(session.fileSystem, scene.dir, `${scene.title} (andra versionen)`, otherBody);
  }
  session.autosave.release();
  session.hooks.onConflict(null);
  if (choice === "theirs") return showScene(session, scene.dir, scene.id, conflict.diskText);
  session.autosave.loaded(conflict.diskText);
  session.autosave.changed(conflict.editorText);
  await session.autosave.flush();
}

/** The title lives in the scene file. The open scene is renamed through the editor's autosave. */
export async function renameScene(session: SceneSession, dir: string, id: string, title: string) {
  const scene = session.scene;
  if (scene?.dir === dir && scene.id === id) {
    session.scene = { ...scene, frontMatter: withSceneTitle(scene.frontMatter, title), title };
    session.hooks.onScene(session.scene);
    const doc = session.hooks.editor.currentDoc();
    if (doc) sceneEdited(session, doc);
    await session.autosave.flush();
    return;
  }
  const path = scenePath(dir, id);
  const { frontMatter, body } = splitSceneFile(await session.fileSystem.readText(path));
  const renamed = joinSceneFile({ frontMatter: withSceneTitle(frontMatter, title), body });
  await writeAtomic(session.fileSystem, path, renamed);
}
