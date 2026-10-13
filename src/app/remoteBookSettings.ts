import { withBookField } from "../project/bookFields.js";
import { seriesFolder, shownSettings } from "../project/bookFileSettings.js";
import { bookFileCalls } from "../project/bookFiles.js";
import { withNamedLabel, withPieces, type BookParts } from "../project/bookSettings.js";
import { closeScene } from "./sceneSession.js";
import { platform } from "./platform.js";
import { bookOf, until } from "./remoteBook.js";
import type { AppState } from "./App.js";

// window.penna's calls for the book's settings, labels, pieces, series and comments: the same
// changes as bookFileCalls, made through the open book so the app and the files agree.

async function changeBook(current: () => AppState, change: (parts: BookParts) => BookParts) {
  const book = bookOf(current());
  await current().updateProject(change({ fields: book.fields, tree: book.tree }));
  await until(() => current().project !== book);
}

const folderOf = (app: AppState) => ({ fileSystem: platform.fileSystem, dir: bookOf(app).dir });
const filesOf = (app: AppState) => bookFileCalls(folderOf(app));

const settingCalls = (current: () => AppState) => ({
  book: async (field?: string, value?: string) => {
    if (field === undefined) return shownSettings(bookOf(current()).fields);
    return changeBook(current, (parts) => ({
      ...parts,
      fields: withBookField(parts.fields, field, value ?? ""),
    }));
  },
  label: (id: string, name: string, state?: string) =>
    changeBook(current, (parts) => withNamedLabel(parts, id, name, state !== "av")),
  pieces: (...ids: string[]) => changeBook(current, (parts) => withPieces(parts, ids)),
});

const seriesCalls = (current: () => AppState) => ({
  series: async (name: string) => {
    const folder = await seriesFolder(folderOf(current()), name);
    await changeBook(current, (parts) => ({
      ...parts,
      fields: { ...parts.fields, series: folder },
    }));
    return folder;
  },
  // An open note is closed first: its file moves to the series folder.
  toSeries: async (...ids: string[]) => {
    const app = current();
    if (!(await closeScene(app.session))) throw new Error("Den öppna texten kunde inte sparas.");
    await filesOf(app).toSeries(...ids);
    await app.refresh();
    await app.seriesState.refreshSeries();
  },
});

const commentCalls = (current: () => AppState) => ({
  comments: (id: string) => filesOf(current()).comments(id),
  comment: (id: string, quote: string, text: string, author?: string) =>
    filesOf(current()).comment(id, quote, text, author),
});

export const settingCallsInApp = (current: () => AppState) => ({
  ...settingCalls(current),
  ...seriesCalls(current),
  ...commentCalls(current),
});
