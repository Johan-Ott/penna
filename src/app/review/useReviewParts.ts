import type { useEditorView } from "../../editor/useEditorView.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { useComments } from "./useComments.js";
import { useRevision } from "./useRevision.js";

type Parts = {
  project: Project | null;
  scene: OpenScene | null;
  editor: ReturnType<typeof useEditorView>;
  author: string;
};

/** What others say about the open scene: comments, and an editor's changes read back from Word. */
export function useReviewParts(parts: Parts) {
  return { comments: useComments(parts), revision: useRevision(parts) };
}
