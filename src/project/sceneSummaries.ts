import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import {
  sceneStatus,
  sceneTitle,
  splitSceneFile,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";

export interface SceneSummary {
  title: string;
  words: number;
  status: SceneStatus;
}

function summarize(text: string): SceneSummary {
  const { frontMatter, body } = splitSceneFile(text);
  const title = sceneTitle(frontMatter) ?? "Namnlös scen";
  return {
    title,
    words: countDocumentWords(parseMarkdown(body)),
    status: sceneStatus(frontMatter),
  };
}

// Every autosave makes the folder watcher read the project again, so a scene is only parsed
// again when its text has changed. One entry per scene file keeps the cache small.
const latestByPath = new Map<string, { text: string; summary: SceneSummary }>();

function cachedSummary(path: string, text: string): SceneSummary {
  const latest = latestByPath.get(path);
  if (latest?.text === text) return latest.summary;
  const summary = summarize(text);
  latestByPath.set(path, { text, summary });
  return summary;
}

/** Title and word count for each scene, keyed by scene id. */
export async function readSceneSummaries(fileSystem: FileSystem, dir: string, sceneIds: string[]) {
  const entries = await Promise.all(
    sceneIds.map(async (id) => {
      const path = joinPath(dir, `scenes/${id}.md`);
      return [id, cachedSummary(path, await fileSystem.readText(path))] as const;
    }),
  );
  return Object.fromEntries(entries);
}
