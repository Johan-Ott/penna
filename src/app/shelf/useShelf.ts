import { useCallback, useEffect, useState } from "react";
import { readShelf, type ShelfBook } from "../../project/shelf.js";
import { platform } from "../platform.js";

// Reading every scene of every book takes seconds for long books, so the shelf as last read is
// shown at once and replaced when the books are read again.
const CACHE_KEY = "penna.shelf";

function cachedShelf(libraryDir: string | null): ShelfBook[] | null {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      libraryDir: string | null;
      books: ShelfBook[];
    } | null;
    return cached?.libraryDir === libraryDir && Array.isArray(cached.books) ? cached.books : null;
  } catch {
    return null;
  }
}

/** The shelf as last read, wherever it was, for choosing among the writer's other books. */
export function knownBooks(): ShelfBook[] {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as {
      books?: unknown;
    } | null;
    return Array.isArray(cached?.books) ? (cached.books as ShelfBook[]) : [];
  } catch {
    return [];
  }
}

function cacheShelf(libraryDir: string | null, books: ShelfBook[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ libraryDir, books }));
  } catch {
    // Without storage the shelf is only read, as before.
  }
}

export function useShelf(libraryDir: string | null, knownProjects: string[]) {
  const [books, setBooks] = useState<ShelfBook[] | null>(() => cachedShelf(libraryDir));
  const known = knownProjects.join("\n");
  const reload = useCallback(async () => {
    const read = await readShelf(platform.fileSystem, libraryDir, known ? known.split("\n") : []);
    cacheShelf(libraryDir, read);
    setBooks(read);
  }, [libraryDir, known]);
  useEffect(() => {
    void reload();
    if (!libraryDir) return;
    const stopWatching = platform.watchFolder(libraryDir, () => void reload());
    return () => void stopWatching.then((stop) => stop());
  }, [libraryDir, reload]);
  return books;
}
