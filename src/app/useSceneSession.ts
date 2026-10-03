import { useEffect, useMemo, useRef, useState } from "react";
import { useEditorView } from "../editor/useEditorView.js";
import type { SaveStatus } from "../storage/autosave.js";
import { platform } from "./platform.js";
import {
  createSceneSession,
  sceneEdited,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
} from "./sceneSession.js";

/** React state for the scene session. The logic lives in sceneSession.ts. */
export function useSceneSession() {
  const [scene, setScene] = useState<OpenScene | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [conflict, setConflict] = useState<DiskConflict | null>(null);
  const sessionRef = useRef<SceneSession | null>(null);
  const editor = useEditorView((doc) => {
    if (sessionRef.current) sceneEdited(sessionRef.current, doc);
  });
  const { load, viewRef, editableRef } = editor;

  const session = useMemo(
    () =>
      createSceneSession(platform.fileSystem, {
        editor: { load, currentDoc: () => viewRef.current?.state.doc ?? null },
        // Set before the scene's text loads, so the editor is writable exactly when a scene is open.
        onScene: (opened) => {
          editableRef.current = opened !== null;
          setScene(opened && { ...opened });
        },
        onConflict: setConflict,
        onSaveStatus: setSaveStatus,
      }),
    [load, viewRef, editableRef],
  );
  sessionRef.current = session;
  useEffect(() => platform.guardClose(() => session.autosave.flush()), [session]);

  return { session, scene, saveStatus, conflict, editor };
}
