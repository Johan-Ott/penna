import { useEffect, useMemo, useRef, useState } from "react";
import { manuscriptSceneIds } from "../project/tree.js";
import type { Project } from "./useProject.js";
import { useEditorView } from "../editor/useEditorView.js";
import type { SaveStatus } from "../storage/autosave.js";
import { platform } from "./platform.js";
import {
  closeScene,
  createSceneSession,
  openScene,
  sceneEdited,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
  type SceneSessionHooks,
} from "./sceneSession.js";

/** React state for the scene session. The logic lives in sceneSession.ts. */
export function useSceneSession() {
  const [scene, setScene] = useState<OpenScene | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [conflict, setConflict] = useState<DiskConflict | null>(null);
  const sessionRef = useRef<SceneSession | null>(null);
  const savedRef = useRef<SceneSessionHooks["onSaved"]>(undefined);
  const editor = useEditorView((doc) => {
    if (sessionRef.current) sceneEdited(sessionRef.current, doc);
  });
  const { load, viewRef, modes } = editor;

  const session = useMemo(
    () =>
      createSceneSession(platform.fileSystem, {
        editor: { load, currentDoc: () => viewRef.current?.state.doc ?? null },
        // Set before the scene's text loads, so the editor is writable exactly when a scene is open.
        onScene: (opened) => {
          modes.current.isEditable = opened !== null;
          setScene(opened && { ...opened });
        },
        onConflict: setConflict,
        onSaveStatus: setSaveStatus,
        onSaved: (scene, before, after) => savedRef.current?.(scene, before, after),
      }),
    [load, viewRef, modes],
  );
  sessionRef.current = session;
  useEffect(() => platform.guardClose(() => session.autosave.flush()), [session]);

  return { session, scene, saveStatus, conflict, editor, savedRef };
}

// A scene still in the cloud has no text here yet, so it cannot open.
export function openIfOnDisk(session: SceneSession, project: Project, id: string) {
  if (project.scenes.includes(id)) void openScene(session, project.dir, id);
}

// A project opens on its first scene with the cursor ready. A new project never keeps the
// previous project's scene open; with no scenes, none is open. Crash text is settled first.
export function useOpenFirstScene(
  project: Project | null,
  session: SceneSession,
  focusEditor: () => void,
) {
  useEffect(() => {
    if (!project || session.scene?.dir === project.dir || project.recoverable.length > 0) return;
    const onDisk = manuscriptSceneIds(project.tree).filter((id) => project.scenes.includes(id));
    const firstScene = onDisk[0] ?? project.scenes[0];
    if (!firstScene) return void closeScene(session);
    void openScene(session, project.dir, firstScene).then(focusEditor);
  }, [project, session, focusEditor]);
}
