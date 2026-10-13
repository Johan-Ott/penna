import { t } from "../i18n/i18n.js";
import { openProjectFolder } from "../storage/projectFolder.js";
import { withBookField } from "./bookFields.js";
import { changeProject, newScene, readBook, type BookFolder } from "./bookFolder.js";
import { withNamedLabel } from "./bookSettings.js";
import { additionsOf, pieceIdsFrom, withAdditions } from "./pieceAdditions.js";
import { parentOf } from "./libraryFolders.js";
import { readProjectFile, writeProjectFile } from "./projectFile.js";
import { createSeries, listSeries, moveNotesToSeries, seriesDirOf, seriesTitle } from "./series.js";

// The book's settings, labels, pieces and series, changed in project.json as the app changes them.

const SHOWN_FIELDS = [
  "title",
  "type",
  "totalGoal",
  "dailyGoal",
  "deadline",
  "narration",
  "language",
  "series",
  "labels",
];

/** The settings a writer sets, without the book's design and the rest. */
export const shownSettings = (fields: Record<string, unknown>) =>
  Object.fromEntries(SHOWN_FIELDS.filter((key) => key in fields).map((key) => [key, fields[key]]));

/** The series with this name beside the book, made when there is none. */
export async function seriesFolder(book: BookFolder, name: string) {
  const library = parentOf(book.dir);
  const wanted = name.trim().toLowerCase();
  const existing = (await listSeries(book.fileSystem, library)).find(
    (folder) => seriesTitle(folder).toLowerCase() === wanted,
  );
  return existing ?? createSeries(book.fileSystem, library, name.trim());
}

async function readNotes(book: BookFolder) {
  const listing = await openProjectFolder(book.fileSystem, book.dir);
  const file = await readProjectFile(book.fileSystem, book.dir, listing.scenes);
  return { dir: book.dir, fields: file.fields, tree: file.tree };
}

export const settingCalls = (book: BookFolder) => ({
  /** The book's settings, or one changed by its Swedish name: book("totalmål", "115000"). */
  book: async (field?: string, value?: string) => {
    if (field === undefined) return shownSettings((await readBook(book)).fields);
    const fields = (parts: { fields: Record<string, unknown> }) =>
      withBookField(parts.fields, field, value ?? "");
    return changeProject(book, (parts) => ({ ...parts, fields: fields(parts) }));
  },
  /** A label on a node by its name, a new label if none has it; "av" takes it off. */
  label: (id: string, name: string, state?: string) =>
    changeProject(book, (parts) => withNamedLabel(parts, id, name, state !== "av")),
  /** Pieces from Ny bok, such as deckare or romans, added as Mallar och bitar adds them. */
  pieces: async (...ids: string[]) => {
    const additions = additionsOf(pieceIdsFrom(ids), null);
    const sceneIds = await Promise.all(additions.chapters.map(() => newScene(book, t("Scen 1"))));
    return changeProject(book, (parts) => withAdditions(parts, additions, sceneIds));
  },
});

/** The book's series, and its notes moved there to be shared. */
export const seriesCalls = (book: BookFolder) => ({
  /** The book in a series by its name, a new series if none has it; the answer is its folder. */
  series: async (name: string) => {
    const folder = await seriesFolder(book, name);
    await changeProject(book, (parts) => ({
      ...parts,
      fields: { ...parts.fields, series: folder },
    }));
    return folder;
  },
  /** Notes moved from the book to its series, so the series' other books share them. */
  toSeries: async (...ids: string[]) => {
    const notes = await readNotes(book);
    const seriesDir = seriesDirOf(book.dir, notes.fields);
    if (!seriesDir) throw new Error("Boken hör inte till någon serie. Kör series <namn> först.");
    const series = await readNotes({ fileSystem: book.fileSystem, dir: seriesDir });
    const moved = await moveNotesToSeries(book.fileSystem, notes, series, ids);
    await writeProjectFile(book.fileSystem, seriesDir, moved.seriesFields, moved.seriesTree);
    await changeProject(book, (parts) => ({ ...parts, tree: moved.bookTree }));
  },
});
