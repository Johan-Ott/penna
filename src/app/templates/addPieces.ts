import { withAdditions, type Additions } from "../../project/pieceAdditions.js";
import { platform } from "../platform.js";
import { createScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

export { additionsOf } from "../../project/pieceAdditions.js";

/** The book's tree and fields with the additions it does not have yet. */
export async function addToBook(project: Project, additions: Additions) {
  const newScene = () => createScene(platform.fileSystem, project.dir, t("Scen 1"));
  const sceneIds = await Promise.all(additions.chapters.map(newScene));
  return withAdditions(project, additions, sceneIds);
}
