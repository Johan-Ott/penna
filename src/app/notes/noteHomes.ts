import { openScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

/** Where notes live: the series first, when the book belongs to one, then the book itself. */
export const homesOf = (book: Project, series: Project | null) =>
  series ? [series, book] : [book];

/** Opens a scene or note from whichever folder holds it. */
export function openInHome(session: SceneSession, homes: Project[], id: string) {
  const home = homes.find((candidate) => candidate.scenes.includes(id));
  if (home) void openScene(session, home.dir, id);
}
