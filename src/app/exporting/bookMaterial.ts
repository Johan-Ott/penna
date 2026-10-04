import { bookDetails, bookOutline, readBookScenes } from "../../export/book.js";
import { designOf } from "../../export/bookDesign.js";
import type { BookExtras } from "../../export/bookParts.js";
import type { PrintInput } from "../../export/typstBook.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import type { ExportChoices } from "./useExport.js";

/** Where each optional part keeps its text in project.json. */
export const EXTRA_FIELDS = {
  hasDedication: "dedication",
  hasThanks: "thanks",
  hasAbout: "aboutAuthor",
} as const;

// Only the parts the writer ticked, and only those with text, go into the book.
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

/** Every scene is read before anything is built, so a missing one stops the export early. */
export async function bookMaterial(project: Project, generalAuthor: string) {
  const words = manuscriptWords(project.tree, project.summaries);
  const details = bookDetails(project.fields, generalAuthor, words);
  const outline = bookOutline(project.tree);
  const sceneIds = outline.flatMap((item) => (item.kind === "scene" ? [item.id] : []));
  const titles = Object.fromEntries(
    sceneIds.map((id) => [id, project.summaries[id]?.title ?? "Namnlös scen"]),
  );
  const scenes = await readBookScenes(platform.fileSystem, project.dir, sceneIds, titles);
  return { book: { ...details, title: details.title || project.name }, outline, scenes };
}

export type BookMaterial = Awaited<ReturnType<typeof bookMaterial>>;

/** What Typst sets: the book with its design from project.json, for the PDF and the preview. */
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
