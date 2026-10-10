import type { ImportedNode } from "../import/markdownImport.js";
import { uiLanguage } from "../i18n/i18n.js";
import { defaultLabels } from "./labels.js";
import english from "./templates.en.json";
import swedish from "./templates.sv.json";

// A new book starts from one structure, its chapters named for the steps of the story, and any
// pieces: notes, labels and chapters for a genre. The texts live in templates.sv.json and .en.json.

export interface BookTemplate {
  id: string;
  name: string;
  hint: string;
  /** The name of each chapter's empty scene, when it is not "Scen 1". */
  scene?: string;
  totalGoal: number | null;
  /** Note sorts beside Personer, Platser and the others. */
  sorts: string[];
  /** Name and colour. */
  labels: string[][];
  /** An empty part title puts its chapters straight in the book. */
  parts: { title: string; chapters: string[][] }[];
}

export interface TemplatePiece {
  id: string;
  name: string;
  hint: string;
  sorts: string[];
  labels: string[][];
  /** Chapters added at the end of the book, as [title, what happens]. */
  chapters: string[][];
}

const texts = () => (uiLanguage() === "en" ? english : swedish);

export const structures = (): BookTemplate[] => texts().structures;
export const templatePieces = (): TemplatePiece[] => texts().pieces;

/** The structure Penna suggests for a kind of book and the pieces the writer picked. */
export function suggestedStructure(type: string, pieces: string[]): string {
  if (type === "noveller") return "novell";
  if (type !== "roman") return "tom";
  if (pieces.includes("deckare")) return "deckare";
  if (pieces.includes("romans")) return "romantasy";
  if (pieces.includes("magi")) return "hjaltens-resa";
  return "tre-akter";
}

const unique = (values: string[]) => [...new Set(values)];

// Penna's standard labels stay, with the pieces' own after them.
function labelsWith(pieces: TemplatePiece[], own: string[][]) {
  const added = [...own, ...pieces.flatMap((piece) => piece.labels)];
  if (added.length === 0) return [];
  const standard = defaultLabels().map((label) => [label.name, label.color]);
  const all = [...standard, ...added];
  return all.filter(([name], index) => all.findIndex(([other]) => other === name) === index);
}

/** The structure with the chosen pieces' notes, labels and closing chapters added. */
export function composeTemplate(structure: BookTemplate, pieceIds: string[]): BookTemplate {
  const pieces = templatePieces().filter((piece) => pieceIds.includes(piece.id));
  const closing = pieces.flatMap((piece) => piece.chapters);
  return {
    ...structure,
    sorts: unique([...structure.sorts, ...pieces.flatMap((piece) => piece.sorts)]),
    labels: labelsWith(pieces, structure.labels),
    parts: closing.length
      ? [...structure.parts, { title: "", chapters: closing }]
      : structure.parts,
  };
}

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
