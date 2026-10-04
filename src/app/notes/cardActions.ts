import type { SceneSession } from "../sceneSession.js";
import type { View } from "../useWritingMode.js";
import type { Project } from "../useProject.js";
import { openInHome } from "./noteHomes.js";

export interface CardActions {
  open: (id: string) => void;
}

/** A note is a scene: it opens in Skriv, from the series or the book, wherever it lives. */
export function cardActions(parts: {
  homes: Project[];
  session: SceneSession;
  setView: (view: View) => void;
}): CardActions {
  return {
    open: (id) => {
      parts.setView("skriv");
      openInHome(parts.session, parts.homes, id);
    },
  };
}
