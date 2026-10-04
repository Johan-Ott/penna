import { parentOf } from "../project/libraryFolders.js";
import type { FileSystem } from "../storage/fileSystem.js";
import { docxToMarkdown } from "./docxImport.js";
import { ImportError, splitManuscript, type ImportedNode } from "./markdownImport.js";
import { readScrivener } from "./scrivenerImport.js";
import { t } from "../i18n/i18n.js";

/** What the open dialog offers. A Scrivener project is picked by the .scrivx file inside it. */
export const MANUSCRIPT_FILES = {
  name: t("Manus"),
  extensions: ["docx", "scrivx", "md", "markdown", "txt"],
};

const extensionOf = (path: string) => /\.([^./]+)$/.exec(path)?.[1]?.toLowerCase() ?? "";
const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");

async function readBook(fileSystem: FileSystem, path: string, bytes: Uint8Array) {
  const extension = extensionOf(path);
  if (extension === "scrivx" && !path.includes("/")) {
    throw new ImportError(t("Välj Scrivener-projektet med Välj fil…, så hittar Penna texterna."));
  }
  if (extension === "scrivx") return readScrivener(fileSystem, parentOf(path));
  if (extension === "docx") return splitManuscript(await docxToMarkdown(bytes));
  return splitManuscript(new TextDecoder().decode(bytes));
}

/** A picked manuscript as a book to write as a new project, named after its file. */
export async function importManuscript(
  fileSystem: FileSystem,
  picked: { path: string; bytes: Uint8Array },
): Promise<{ title: string; book: ImportedNode[] }> {
  const book = await readBook(fileSystem, picked.path, picked.bytes);
  if (book.length === 0) throw new ImportError(t("Filen innehöll ingen text att importera."));
  return { title: nameOf(picked.path), book };
}
