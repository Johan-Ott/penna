import type { ImportedNode } from "../import/markdownImport.js";
import { uiLanguage } from "../i18n/i18n.js";
import english from "./templates.en.json";
import swedish from "./templates.sv.json";

// Ways to start a book: chapters named for the steps of a story structure, with what each is for.
// The texts live in templates.sv.json and templates.en.json, one file per language.

export interface BookTemplate {
  id: string;
  name: string;
  hint: string;
  /** The name of each chapter's empty scene, when it is not "Scen 1". */
  scene?: string;
  totalGoal: number | null;
  /** Note sorts beside Personer, Platser and the others. */
  sorts: string[];
  /** Name and colour; none keeps Penna's standard labels. */
  labels: string[][];
  /** An empty part title puts its chapters straight in the book. */
  parts: { title: string; chapters: string[][] }[];
}

export const bookTemplates = (): BookTemplate[] => (uiLanguage() === "en" ? english : swedish);

export const templateOf = (id: string): BookTemplate =>
  bookTemplates().find((template) => template.id === id) ?? (swedish[0] as BookTemplate);

// Each chapter gets one empty scene, so the writer can start writing in any step.
const chapterNode = ([title = "", summary = ""]: string[], scene: string): ImportedNode => ({
  kind: "chapter",
  title,
  summary,
  children: [{ kind: "scene", title: scene, body: "" }],
});

/** The template's book, in the form an imported manuscript has. */
export function templateBook(template: BookTemplate, sceneTitle: string): ImportedNode[] {
  return template.parts.flatMap((part) => {
    const chapters = part.chapters.map((chapter) =>
      chapterNode(chapter, template.scene ?? sceneTitle),
    );
    return part.title
      ? [{ kind: "part" as const, title: part.title, children: chapters }]
      : chapters;
  });
}
