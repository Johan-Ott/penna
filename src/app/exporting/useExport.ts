import { useState } from "react";
import {
  bookDetails,
  bookOutline,
  ExportError,
  readBookScenes,
  type Typography,
} from "../../export/book.js";
import { buildEpub } from "../../export/epub.js";
import { standardManuscript } from "../../export/standardManuscript.js";
import { findCover } from "../../project/cover.js";
import { manuscriptWords } from "../../project/treeLabels.js";
import { platform, type FileKind } from "../platform.js";
import type { Project } from "../useProject.js";

/** Pågår, klar and fel, as the design shows them. */
export type ExportState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "saved"; fileName: string }
  | { kind: "failed"; sceneTitle: string; reason: string };

export type ExportFormat = "manus" | "ebok";

export interface ExportChoices {
  format: ExportFormat;
  typography: Typography;
  hasTitlePage: boolean;
  hasCopyrightPage: boolean;
  hasContents: boolean;
}

type SaveFields = (fields: Record<string, unknown>) => void;

export const FILE_KINDS: Record<ExportFormat, FileKind> = {
  manus: { name: "Word-dokument", extension: "docx" },
  ebok: { name: "E-bok", extension: "epub" },
};

const fileNameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

/** Every scene is read before anything is built, so a missing one stops the export early. */
async function bookMaterial(project: Project, generalAuthor: string) {
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

// The same id every time, so e-book readers know a new export is the same book: the ISBN when
// there is one, otherwise an id made at the first export and kept in project.json.
function bookIdentifier(project: Project, saveFields: SaveFields) {
  const isbn = String(project.fields["isbn"] ?? "").replace(/[^\dX]/gi, "");
  if (isbn) return `urn:isbn:${isbn}`;
  if (typeof project.fields["bookId"] === "string") return project.fields["bookId"];
  const bookId = `urn:uuid:${crypto.randomUUID()}`;
  saveFields({ bookId });
  return bookId;
}

interface ExportJob {
  project: Project;
  generalAuthor: string;
  choices: ExportChoices;
  saveFields: SaveFields;
}

async function buildFile({ project, generalAuthor, choices, saveFields }: ExportJob) {
  const material = await bookMaterial(project, generalAuthor);
  if (choices.format === "manus") return standardManuscript({ ...material, ...choices });
  const picture = await findCover(platform.fileSystem, project.dir);
  return buildEpub({
    ...material,
    ...(picture ? { cover: { type: picture.size.type, bytes: picture.bytes } } : {}),
    typography: choices.typography,
    identifier: bookIdentifier(project, saveFields),
    modified: new Date(),
    parts: choices,
  });
}

async function exportBook(job: ExportJob): Promise<ExportState> {
  try {
    const bytes = await buildFile(job);
    const kind = FILE_KINDS[job.choices.format];
    const path = await platform.saveFile(`${job.project.name}.${kind.extension}`, bytes, kind);
    return path ? { kind: "saved", fileName: fileNameOf(path) } : { kind: "idle" };
  } catch (error) {
    const known = error instanceof ExportError;
    return {
      kind: "failed",
      sceneTitle: known ? error.sceneTitle : job.project.name,
      reason: known ? error.reason : "Filen kunde inte skapas eller sparas.",
    };
  }
}

export function useExport(project: Project | null, generalAuthor: string, saveFields: SaveFields) {
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const run = async (choices: ExportChoices) => {
    if (!project) return;
    setState({ kind: "running" });
    setState(await exportBook({ project, generalAuthor, choices, saveFields }));
  };
  return {
    state,
    run: (choices: ExportChoices) => void run(choices),
    reset: () => setState({ kind: "idle" }),
  };
}
