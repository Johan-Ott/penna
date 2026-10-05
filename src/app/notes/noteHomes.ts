import { openScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

/** The series first, so a note there wins over one with the same id in the book. */
export const homesOf = (book: Project, series: Project | null) =>
  series ? [series, book] : [book];

export function openInHome(session: SceneSession, homes: Project[], id: string) {
  const home = homes.find((candidate) => candidate.scenes.includes(id));
  if (home) void openScene(session, home.dir, id);
}
