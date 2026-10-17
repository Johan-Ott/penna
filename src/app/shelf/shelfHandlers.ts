import type { ShelfBook } from "../../project/shelf.js";
import { forgetProject, type AppPreferences } from "../appPreferences.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "../platform.js";
import type { PreferenceChange } from "../useStartup.js";
import { driveFolderOf, trashOnDrive } from "./useCloudBooks.js";

type Startup = {
  preferences: AppPreferences;
  updatePreferences: (change: PreferenceChange) => void;
};

async function locate(book: ShelfBook, update: (change: PreferenceChange) => void) {
  const found = await platform.pickFolder();
  if (!found || !(await platform.fileSystem.list(found)).includes("project.json")) return;
  update((current) => ({
    ...current,
    knownProjects: current.knownProjects.map((dir) => (dir === book.dir ? found : dir)),
  }));
}

// A book removed from this device shows again as a book in Drive, unless it went from both.
export function shelfHandlers(startup: Startup, isPhone: boolean, onDriveChange: () => void) {
  const { preferences, updatePreferences } = startup;
  const forget = (book: ShelfBook) =>
    updatePreferences((current) => forgetProject(current, book.dir));
  const remove = async (book: ShelfBook, isEverywhere: boolean) => {
    const folderId = isEverywhere ? await driveFolderOf(book.dir) : null;
    if (!(await platform.removeBook?.(book.dir, book.title, isEverywhere))) return;
    forget(book);
    if (folderId) await trashOnDrive(folderId);
    onDriveChange();
  };
  const fail = recordFailure("Boken kunde inte tas bort");
  return {
    onLocate: isPhone ? null : (book: ShelfBook) => void locate(book, updatePreferences),
    onForget: forget,
    onRemove: (book: ShelfBook) => void remove(book, false).catch(fail),
    onRemoveEverywhere: preferences.isDriveSyncOn
      ? (book: ShelfBook) => void remove(book, true).catch(fail)
      : null,
  };
}
