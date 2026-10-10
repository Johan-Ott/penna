import { useState } from "react";
import type { useEditorView } from "../../editor/useEditorView.js";
import { recordFailure } from "../errorLog.js";
import { openScene, type OpenScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { useComments } from "./useComments.js";
import { useRevision } from "./useRevision.js";

type Parts = {
  project: Project | null;
  scene: OpenScene | null;
  session: SceneSession;
  editor: ReturnType<typeof useEditorView>;
  author: string;
};

// Ends Förslagsläge: the suggestions are saved, and the scene shows its own text again.
async function stopSuggesting(session: SceneSession) {
  if (!(await session.autosave.flush())) return false;
  session.isSuggesting = false;
  const scene = session.scene;
  return scene ? openScene(session, scene.dir, scene.id) : true;
}

// Förslagsläge: on, what is typed goes beside the scene; off, it shows as changes to accept.
function useSuggesting(session: SceneSession, onDone: () => void) {
  const [isSuggesting, setSuggesting] = useState(false);
  const start = () => ((session.isSuggesting = true), setSuggesting(true));
  const stop = async () => {
    if (!(await stopSuggesting(session))) return;
    setSuggesting(false);
    onDone();
  };
  return { isSuggesting, start, stop: () => void stop().catch(recordFailure("Förslag")) };
}

/** What others say about the open scene: comments, and changes suggested or read back from Word. */
export function useReviewParts(parts: Parts) {
  const revision = useRevision(parts);
  const suggesting = useSuggesting(parts.session, revision.reload);
  return { comments: useComments(parts), revision, suggesting };
}
