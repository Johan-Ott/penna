import type { SceneSession } from "../sceneSession.js";
import type { View } from "../useWritingMode.js";
import type { useProjectActions } from "../useProjectActions.js";
import type { Project } from "../useProject.js";
import { openIfOnDisk } from "../useSceneSession.js";

export interface CardActions {
  open: (id: string) => void;
  /** A new note in a sort, such as Personer. */
  create: (folderId: string) => void;
}

/** A note is a scene: it opens in Skriv, and a new one is made in its sort. */
export function cardActions(parts: {
  project: Project | null;
  session: SceneSession;
  actions: ReturnType<typeof useProjectActions>;
  setView: (view: View) => void;
}): CardActions {
  const { project, session } = parts;
  return {
    open: (id) => {
      if (!project) return;
      parts.setView("skriv");
      openIfOnDisk(session, project, id);
    },
    create: (folderId) => {
      parts.setView("skriv");
      void parts.actions.newItem("scene", { inside: folderId });
    },
  };
}
