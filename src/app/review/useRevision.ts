import { useCallback, useEffect, useMemo, useState } from "react";
import { documentText } from "../../editor/documentText.js";
import { acceptChange, refreshRevision } from "../../editor/revisionMarks.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import {
  revisionChanges,
  sameChange,
  withoutChange,
  type RevisionChange,
} from "../../manuscript/revision.js";
import { finishRevision, readRevision, writeRevision } from "../../project/revisions.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";

type Editor = ReturnType<typeof useEditorView>;
type Parts = { project: Project | null; scene: OpenScene | null; editor: Editor };

// Counted again when the writer pauses, not on every key.
const SETTLE_MS = 400;

const currentText = (editor: Editor) => {
  const doc = editor.viewRef.current?.state.doc;
  return doc ? documentText(doc).text : "";
};

// The open scene's editor's version, read when the scene opens or a new one is read in.
function useRevisedText({ project, scene }: Parts) {
  const [revised, setRevised] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const dir = project?.dir ?? null;
  const sceneId = scene?.id ?? null;
  useEffect(() => {
    setRevised(null);
    if (dir && sceneId) void readRevision(platform.fileSystem, dir, sceneId).then(setRevised);
  }, [dir, sceneId, round]);
  const reload = useCallback(() => setRound((value) => value + 1), []);
  return { revised, setRevised, dir, sceneId, reload };
}

function useChanges(editor: Editor, revised: string | null) {
  const doc = editor.editorState?.doc;
  const [settled, setSettled] = useState(doc);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(doc), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [doc]);
  const changes = useMemo(
    () =>
      revised === null || !settled ? [] : revisionChanges(documentText(settled).text, revised),
    [revised, settled],
  );
  // Only the stable parts of the editor, so marking the changes does not start another round.
  const { modes, run } = editor;
  useEffect(() => {
    modes.current.revisionChanges = changes;
    run(refreshRevision, false);
  }, [changes, modes, run]);
  return changes;
}

// One at a time, counted again after each; stops if a change would not go away.
function acceptEvery(editor: Editor, revised: string) {
  const count = () => revisionChanges(currentText(editor), revised);
  for (let left = count(), rounds = left.length; left[0] && rounds > 0; rounds--) {
    editor.run(acceptChange(left[0]));
    left = count();
  }
}

/** The editor's changes to the open scene, to accept or reject one at a time or all at once. */
export function useRevision(parts: Parts) {
  const { editor } = parts;
  const { revised, setRevised, dir, sceneId, reload } = useRevisedText(parts);
  const changes = useChanges(editor, revised);
  // Found again in the text as it is now, since the writer may have typed since it was shown.
  const fresh = (change: RevisionChange) =>
    revised === null ? null : sameChange(revisionChanges(currentText(editor), revised), change);
  const accept = (change: RevisionChange) => {
    const found = fresh(change);
    if (found) editor.run(acceptChange(found));
  };
  const reject = (change: RevisionChange) => {
    const found = fresh(change);
    if (!found || revised === null || !dir || !sceneId) return;
    const next = withoutChange(revised, found);
    setRevised(next);
    void writeRevision(platform.fileSystem, dir, sceneId, next).catch(recordFailure("Redigering"));
  };
  const acceptAll = () => acceptEvery(editor, revised ?? "");
  const finish = () => {
    if (!dir || !sceneId) return;
    setRevised(null);
    void finishRevision(platform.fileSystem, dir, sceneId).catch(recordFailure("Redigering"));
  };
  return { isOpen: revised !== null, changes, accept, reject, acceptAll, finish, reload };
}
