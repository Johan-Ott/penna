import { designOf } from "../../export/bookDesign.js";
import type { PlainFormat } from "../../export/plainFormats.js";
import { findCover } from "../../project/cover.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";
import type { BookExtras } from "../../export/bookParts.js";
import type { BookMaterial } from "./bookMaterial.js";
import type { ExportChoices, ExportFormat } from "./useExport.js";

// The e-book and the plain files, built from the book's material.

type SaveFields = (fields: Record<string, unknown>) => void;

const PLAIN: ExportFormat[] = ["markdown", "text", "html"];
export const isPlain = (format: ExportFormat) => PLAIN.includes(format);

export async function plainFile(material: BookMaterial, choices: ExportChoices, language: string) {
  const { plainBook } = await import("../../export/plainFormats.js");
  const book = { ...material, title: material.book.title, author: material.book.author };
  return plainBook(book, choices.format as PlainFormat, choices.typography, language);
}

// The same id on every export, so e-readers see one book: the ISBN or an id kept in project.json.
function bookIdentifier(project: Project, saveFields: SaveFields) {
  const isbn = String(project.fields["isbn"] ?? "").replace(/[^\dX]/gi, "");
  if (isbn) return `urn:isbn:${isbn}`;
  if (typeof project.fields["bookId"] === "string") return project.fields["bookId"];
  const bookId = `urn:uuid:${crypto.randomUUID()}`;
  saveFields({ bookId });
  return bookId;
}

export async function ebookFile(job: {
  project: Project;
  material: BookMaterial;
  choices: ExportChoices;
  extras: BookExtras;
  language: string;
  saveFields: SaveFields;
}) {
  const { project, material, choices } = job;
  const picture = await findCover(platform.fileSystem, project.dir);
  const { buildEpub } = await import("../../export/epub.js");
  return buildEpub({
    ...material,
    ...(picture ? { cover: { type: picture.size.type, bytes: picture.bytes } } : {}),
    typography: choices.typography,
    language: job.language,
    design: designOf(project.fields),
    extras: job.extras,
    identifier: bookIdentifier(project, job.saveFields),
    modified: new Date(),
    parts: choices,
  });
}
