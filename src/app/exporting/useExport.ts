import { useState } from "react";
import { ExportError, type Typography } from "../../export/book.js";
import { buildEpub } from "../../export/epub.js";
import { TypstError } from "../../export/typstCompile.js";
import { typstSource } from "../../export/typstBook.js";
import { projectZip } from "../../export/projectZip.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { standardManuscript } from "../../export/standardManuscript.js";
import { findCover } from "../../project/cover.js";
import { platform, type FileKind } from "../platform.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import { bookMaterial, chosenExtras, printInput } from "./bookMaterial.js";

/** Pågår, klar and fel, as the design shows them. */
export type ExportState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "saved"; fileName: string }
  | { kind: "failed"; sceneTitle: string; reason: string };

export type ExportFormat = "manus" | "ebok" | "tryck";

export interface ExportChoices {
  format: ExportFormat;
  typography: Typography;
  hasTitlePage: boolean;
  hasCopyrightPage: boolean;
  hasContents: boolean;
  hasDedication: boolean;
  hasThanks: boolean;
  hasAbout: boolean;
}

type SaveFields = (fields: Record<string, unknown>) => void;

export const FILE_KINDS: Record<ExportFormat, FileKind> = {
  manus: { name: "Word-dokument", extension: "docx" },
  ebok: { name: "E-bok", extension: "epub" },
  tryck: { name: "PDF för tryck", extension: "pdf" },
};

const fileNameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);

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
  const language = bookLanguage(project.fields);
  if (choices.format === "manus") {
    return standardManuscript({ ...material, ...choices, language });
  }
  if (choices.format === "tryck") {
    const extras = chosenExtras(project, choices);
    return appTypst.pdf(typstSource(printInput({ project, material, choices, extras })));
  }
  const picture = await findCover(platform.fileSystem, project.dir);
  return buildEpub({
    ...material,
    ...(picture ? { cover: { type: picture.size.type, bytes: picture.bytes } } : {}),
    typography: choices.typography,
    language,
    extras: chosenExtras(project, choices),
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
    const reason = error instanceof TypstError ? `Typst: ${error.message}` : null;
    return {
      kind: "failed",
      sceneTitle: known ? error.sceneTitle : job.project.name,
      reason: known ? error.reason : (reason ?? "Filen kunde inte skapas eller sparas."),
    };
  }
}

const BACKUP_KIND: FileKind = { name: "Zip-arkiv", extension: "zip" };

// The whole folder, snapshots and comments included, named with today's date.
async function saveBackup(project: Project): Promise<ExportState> {
  try {
    const bytes = await projectZip(platform.fileSystem, project.dir);
    const name = `${project.name} ${new Date().toISOString().slice(0, 10)}.zip`;
    const path = await platform.saveFile(name, bytes, BACKUP_KIND);
    return path ? { kind: "saved", fileName: fileNameOf(path) } : { kind: "idle" };
  } catch {
    return {
      kind: "failed",
      sceneTitle: project.name,
      reason: "Säkerhetskopian kunde inte sparas.",
    };
  }
}

export function useExport(project: Project | null, generalAuthor: string, saveFields: SaveFields) {
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const backup = async () => {
    if (!project) return;
    setState({ kind: "running" });
    setState(await saveBackup(project));
  };
  const run = async (choices: ExportChoices) => {
    if (!project) return;
    setState({ kind: "running" });
    setState(await exportBook({ project, generalAuthor, choices, saveFields }));
  };
  return {
    state,
    run: (choices: ExportChoices) => void run(choices),
    backup: () => void backup(),
    reset: () => setState({ kind: "idle" }),
  };
}
