import { t } from "../i18n/i18n.js";
import { splitManuscript, type ImportedNode } from "../import/markdownImport.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { createProject } from "./newProject.js";
import { structures, templatePieces } from "./templates.js";

// What onboarding would ask; a book made from outside starts from the empty structure.
const DETAILS_FROM_OUTSIDE = {
  type: "roman",
  structure: "tom",
  pieces: [],
  dailyGoal: 500,
  deadline: "",
  narration: null,
};

// A chapter starts with a scene to write in, as Nytt kapitel makes it.
function withFirstScenes(nodes: ImportedNode[]): ImportedNode[] {
  return nodes.map((node) => {
    if (node.kind === "scene" || node.kind === "sort") return node;
    if (node.kind === "chapter" && node.children.length === 0) {
      return { ...node, children: [{ kind: "scene", title: t("Scen 1"), body: "" }] };
    }
    return { ...node, children: withFirstScenes(node.children) };
  });
}

/** What `penna.mjs new` can choose of Ny bok's questions; the rest are as onboarding starts them. */
export interface BookChoices {
  title: string;
  structure?: string;
  pieces?: string[];
}

// Ny bok only offers what exists; from outside, a misspelt name would quietly become another.
function checkChoices({ structure, pieces = [] }: BookChoices) {
  const structureIds = structures().map((each) => each.id);
  if (structure !== undefined && !structureIds.includes(structure))
    throw new Error(`Strukturerna: ${structureIds.join(", ")}.`);
  const pieceIds = templatePieces().map((each) => each.id);
  const unknown = pieces.filter((piece) => !pieceIds.includes(piece));
  if (unknown.length > 0) throw new Error(`Bitarna: ${pieceIds.join(", ")}.`);
}

/** A new book in the library, built from a Markdown outline as Importera reads one. */
export async function createBookFromOutline(
  fileSystem: FileSystem,
  libraryDir: string,
  choices: BookChoices,
  outline?: string,
) {
  checkChoices(choices);
  // Without an outline the book still gets a first chapter, so a tool has somewhere to write.
  const imported = withFirstScenes(
    splitManuscript(
      outline ??
        `## ${t("Första kapitlet")}
`,
    ),
  );
  const details = { ...DETAILS_FROM_OUTSIDE, ...choices };
  return createProject(fileSystem, libraryDir, details, imported);
}
