import { CARD_FOLDERS, type CardKind } from "../../project/cards.js";
import type { SceneSession } from "../sceneSession.js";
import type { View } from "../Sidebar.js";
import type { useProjectActions } from "../useProjectActions.js";
import type { Project } from "../useProject.js";
import { openIfOnDisk } from "../useSceneSession.js";

export interface CardActions {
  open: (id: string) => void;
  create: (kind: CardKind) => void;
}

/** A card is a scene: it opens in Skriv, and a new one is a scene made in its folder. */
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
    create: (kind) => {
      const folder = CARD_FOLDERS.find(([folderKind]) => folderKind === kind)?.[1];
      if (!folder) return;
      parts.setView("skriv");
      void parts.actions.newItem("scene", { inside: folder });
    },
  };
}
