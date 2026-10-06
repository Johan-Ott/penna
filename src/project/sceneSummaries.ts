import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import {
  sceneStatus,
  noteLink,
  sceneTitle,
  splitSceneFile,
  type SceneStatus,
} from "../manuscript/sceneFile.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { t } from "../i18n/i18n.js";

export interface SceneSummary {
  title: string;
  words: number;
  status: SceneStatus;
  /** Without one the note follows its sort. */
  link?: boolean;
}

function summarize(text: string): SceneSummary {
  const { frontMatter, body } = splitSceneFile(text);
  const title = sceneTitle(frontMatter) ?? t("Namnlös scen");
  const link = noteLink(frontMatter);
  return {
    title,
    words: countDocumentWords(parseMarkdown(body)),
    status: sceneStatus(frontMatter),
    ...(link === null ? {} : { link }),
  };
}

// Every autosave rereads the project, so a scene is parsed again only when its text changed.
const latestByPath = new Map<string, { text: string; summary: SceneSummary }>();

function cachedSummary(path: string, text: string): SceneSummary {
  const latest = latestByPath.get(path);
  if (latest?.text === text) return latest.summary;
  const summary = summarize(text);
  latestByPath.set(path, { text, summary });
  return summary;
}

/** What is known already: the summaries read last time, and which files changed since. */
export interface KnownSummaries {
  summaries: Record<string, SceneSummary>;
  changed: Set<string>;
}

// A save changes one scene; reading all of them again would be a file call per scene each time.
export async function readSceneSummaries(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
  known?: KnownSummaries,
) {
  const entries = await Promise.all(
    sceneIds.map(async (id) => {
      const path = joinPath(dir, `scenes/${id}.md`);
      const kept = known && !known.changed.has(path) ? known.summaries[id] : undefined;
      return [id, kept ?? cachedSummary(path, await fileSystem.readText(path))] as const;
    }),
  );
  return Object.fromEntries(entries);
}
