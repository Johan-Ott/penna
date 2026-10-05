import type { Node } from "prosemirror-model";
import { bookDetails, bookOutline, readBookScenes, type OutlineItem } from "../../export/book.js";
import { designOf } from "../../export/bookDesign.js";
import type { BookExtras } from "../../export/bookParts.js";
import type { PrintInput } from "../../export/typstBook.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import type { ExportChoices } from "./useExport.js";
import { t } from "../../i18n/i18n.js";

export const EXTRA_FIELDS = {
  hasDedication: "dedication",
  hasThanks: "thanks",
  hasAbout: "aboutAuthor",
} as const;

export function chosenExtras(project: Project, choices: ExportChoices): BookExtras {
  const textOf = (key: keyof typeof EXTRA_FIELDS) => {
    const value = project.fields[EXTRA_FIELDS[key]];
    return choices[key] && typeof value === "string" && value.trim() ? value : null;
  };
  const dedication = textOf("hasDedication");
  const thanks = textOf("hasThanks");
  const about = textOf("hasAbout");
  return {
    ...(dedication ? { dedication } : {}),
    ...(thanks ? { thanks } : {}),
    ...(about ? { about } : {}),
  };
}

export type ExportProgress = (chapter: number, chapters: number) => void;

function chapterNumbers(outline: OutlineItem[]) {
  const numbers: number[] = [];
  let chapter = 0;
  for (const item of outline) {
    if (item.kind === "chapter") chapter += 1;
    if (item.kind === "scene") numbers.push(Math.max(1, chapter));
  }
  return { numbers, chapters: Math.max(1, chapter) };
}

/** Every scene is read first, so a missing one stops the export before anything is written. */
export async function bookMaterial(
  project: Project,
  generalAuthor: string,
  onProgress: ExportProgress = () => undefined,
) {
  const words = manuscriptWords(project.tree, project.summaries);
  const details = bookDetails(project.fields, generalAuthor, words);
  const outline = bookOutline(project.tree);
  const sceneIds = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
  const titles = Object.fromEntries(
    sceneIds.map((id) => [id, project.summaries[id]?.title ?? t("Namnlös scen")]),
  );
  const { numbers, chapters } = chapterNumbers(outline);
  const scenes = new Map<string, Node>();
  for (const [index, id] of sceneIds.entries()) {
    onProgress(numbers[index] ?? chapters, chapters);
    const read = await readBookScenes(platform.fileSystem, project.dir, [id], titles);
    read.forEach((doc, sceneId) => scenes.set(sceneId, doc));
  }
  return { book: { ...details, title: details.title || project.name }, outline, scenes };
}

export type BookMaterial = Awaited<ReturnType<typeof bookMaterial>>;

export function printInput(parts: {
  project: Project;
  material: BookMaterial;
  choices: Pick<ExportChoices, "typography" | "hasTitlePage" | "hasCopyrightPage" | "hasContents">;
  extras: BookExtras;
}): PrintInput {
  const { project, choices } = parts;
  return {
    ...parts.material,
    typography: choices.typography,
    language: bookLanguage(project.fields),
    design: designOf(project.fields),
    parts: choices,
    extras: parts.extras,
    year: new Date().getFullYear(),
  };
}
