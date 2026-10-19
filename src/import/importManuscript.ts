import { parentOf } from "../project/libraryFolders.js";
import type { FileSystem } from "@llkit/storage/fileSystem.js";
import { ImportError, splitManuscript, type ImportedNode } from "./markdownImport.js";
import { readScrivener } from "./scrivenerImport.js";
import { t } from "../i18n/i18n.js";

/** A Scrivener project is picked by the .scrivx file inside it. */
export const MANUSCRIPT_FILES = {
  name: t("Manus"),
  extensions: ["docx", "scrivx", "md", "markdown", "txt"],
};

const extensionOf = (path: string) => /\.([^./]+)$/.exec(path)?.[1]?.toLowerCase() ?? "";
const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1).replace(/\.[^.]+$/, "");

async function titleIn(picked: { path: string; bytes: Uint8Array }) {
  if (extensionOf(picked.path) !== "docx") return null;
  const { docxTitle } = await import("./docxImport.js");
  return docxTitle(picked.bytes);
}

// A manuscript opens on a title page: an untitled first text that holds the title, not a scene.
function withoutTitlePage(book: ImportedNode[], title: string) {
  const [first, ...rest] = book;
  const isTitlePage =
    first?.kind === "scene" &&
    rest.length > 0 &&
    first.body.toLowerCase().includes(title.toLowerCase());
  return isTitlePage ? rest : book;
}

async function readBook(fileSystem: FileSystem, path: string, bytes: Uint8Array) {
  const extension = extensionOf(path);
  if (extension === "scrivx" && !path.includes("/")) {
    throw new ImportError(t("Välj Scrivener-projektet med Välj fil…, så hittar Penna texterna."));
  }
  if (extension === "scrivx") return readScrivener(fileSystem, parentOf(path));
  if (extension === "docx") {
    const { docxToMarkdown } = await import("./docxImport.js");
    return splitManuscript(await docxToMarkdown(bytes));
  }
  return splitManuscript(new TextDecoder().decode(bytes));
}

export async function importManuscript(
  fileSystem: FileSystem,
  picked: { path: string; bytes: Uint8Array },
): Promise<{ title: string; book: ImportedNode[] }> {
  const book = await readBook(fileSystem, picked.path, picked.bytes);
  if (book.length === 0) throw new ImportError(t("Filen innehöll ingen text att importera."));
  const title = await titleIn(picked);
  return {
    title: title ?? nameOf(picked.path),
    book: title ? withoutTitlePage(book, title) : book,
  };
}
