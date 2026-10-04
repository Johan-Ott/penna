import { useRef, useState } from "react";
import { ExportError, type Typography } from "../../export/book.js";
import { buildEpub } from "../../export/epub.js";
import { TypstError } from "../../export/typstCompile.js";
import { typstSource } from "../../export/typstBook.js";
import { seriesDirOf } from "../../project/series.js";
import { projectZip } from "../../export/projectZip.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { standardManuscript } from "../../export/standardManuscript.js";
import { findCover } from "../../project/cover.js";
import { platform, type FileKind } from "../platform.js";
import { appTypst } from "../typstAssets.js";
import type { Project } from "../useProject.js";
import { bookMaterial, chosenExtras, printInput, type ExportProgress } from "./bookMaterial.js";
import { t } from "../../i18n/i18n.js";

/** Pågår, klar and fel, as the design shows them. */
export type ExportState =
  | { kind: "idle" }
  | { kind: "running"; chapter: number; chapters: number }
  | { kind: "saved"; fileName: string; path: string }
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
  ebok: { name: t("E-bok"), extension: "epub" },
  tryck: { name: t("PDF för tryck"), extension: "pdf" },
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
  onProgress: ExportProgress;
  project: Project;
  generalAuthor: string;
  choices: ExportChoices;
  saveFields: SaveFields;
}

async function buildFile({ project, generalAuthor, choices, saveFields, onProgress }: ExportJob) {
  const material = await bookMaterial(project, generalAuthor, onProgress);
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

async function exportBook(job: ExportJob, isCancelled: () => boolean): Promise<ExportState> {
  try {
    const bytes = await buildFile(job);
    if (isCancelled()) return { kind: "idle" };
    const kind = FILE_KINDS[job.choices.format];
    const path = await platform.saveFile(`${job.project.name}.${kind.extension}`, bytes, kind);
    return path ? { kind: "saved", fileName: fileNameOf(path), path } : { kind: "idle" };
  } catch (error) {
    const known = error instanceof ExportError;
    const reason = error instanceof TypstError ? `Typst: ${error.message}` : null;
    return {
      kind: "failed",
      sceneTitle: known ? error.sceneTitle : job.project.name,
      reason: known ? error.reason : (reason ?? t("Filen kunde inte skapas eller sparas.")),
    };
  }
}

const BACKUP_KIND: FileKind = { name: t("Zip-arkiv"), extension: "zip" };

// The whole folder, snapshots and comments included, named with today's date.
async function saveBackup(project: Project): Promise<ExportState> {
  try {
    const seriesDir = seriesDirOf(project.dir, project.fields);
    const hasSeries = seriesDir !== null && (await platform.folderExists(seriesDir));
    const dirs = hasSeries ? [project.dir, seriesDir] : [project.dir];
    const bytes = await projectZip(platform.fileSystem, dirs);
    const name = `${project.name} ${new Date().toISOString().slice(0, 10)}.zip`;
    const path = await platform.saveFile(name, bytes, BACKUP_KIND);
    return path ? { kind: "saved", fileName: fileNameOf(path), path } : { kind: "idle" };
  } catch {
    return {
      kind: "failed",
      sceneTitle: project.name,
      reason: t("Säkerhetskopian kunde inte sparas."),
    };
  }
}

const STARTED: ExportState = { kind: "running", chapter: 0, chapters: 0 };

// Avbryt stops the export before anything is saved; each run has its own number to check.
// Each run has its own number; Avbryt moves on to the next, so an old run's result is dropped.
function useRuns() {
  const [state, setState] = useState<ExportState>({ kind: "idle" });
  const current = useRef(0);
  const finish = (run: number, next: ExportState) => run === current.current && setState(next);
  const cancel = () => {
    current.current += 1;
    setState({ kind: "idle" });
  };
  return { state, setState, current, finish, cancel };
}

export function useExport(project: Project | null, generalAuthor: string, saveFields: SaveFields) {
  const { state, setState, current, finish, cancel } = useRuns();
  const backup = async () => {
    if (!project) return;
    const runNumber = ++current.current;
    setState(STARTED);
    finish(runNumber, await saveBackup(project));
  };
  const run = async (choices: ExportChoices) => {
    if (!project) return;
    const runNumber = ++current.current;
    setState(STARTED);
    const onProgress: ExportProgress = (chapter, chapters) =>
      finish(runNumber, { kind: "running", chapter, chapters });
    const job = { project, generalAuthor, choices, saveFields, onProgress };
    finish(runNumber, await exportBook(job, () => runNumber !== current.current));
  };
  return {
    state,
    run: (choices: ExportChoices) => void run(choices),
    backup: () => void backup(),
    cancel,
    reset: () => setState({ kind: "idle" }),
  };
}
