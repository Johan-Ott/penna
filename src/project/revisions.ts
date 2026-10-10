import { documentText } from "../editor/documentText.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";

/** An editor's version of a scene waits here, as plain text, until the writer has gone through it. */
const REVISIONS_DIR = "redigering";

const revisionPath = (dir: string, sceneId: string) =>
  joinPath(joinPath(dir, REVISIONS_DIR), `${sceneId}.txt`);

/** Null when the scene has no editor's version waiting. */
export const readRevision = (fileSystem: FileSystem, dir: string, sceneId: string) =>
  fileSystem.readText(revisionPath(dir, sceneId)).catch(() => null);

export async function writeRevision(
  fileSystem: FileSystem,
  dir: string,
  sceneId: string,
  text: string,
) {
  await fileSystem.makeDir(joinPath(dir, REVISIONS_DIR));
  await writeAtomic(fileSystem, revisionPath(dir, sceneId), text);
}

/** Done with: moved to trash/ like everything Penna stops using, never deleted. */
export const finishRevision = (fileSystem: FileSystem, dir: string, sceneId: string) =>
  setAside(fileSystem, dir, revisionPath(dir, sceneId), `redigering-${sceneId}.txt`);

/** Förslagsläge's text, kept as an editor's version so Granska shows it the same way. */
export const writeSuggestion = (
  fileSystem: FileSystem,
  dir: string,
  sceneId: string,
  body: string,
) => writeRevision(fileSystem, dir, sceneId, documentText(parseMarkdown(body)).text);
