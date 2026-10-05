import { useCallback, useEffect, useState } from "react";
import { readShelf, type ShelfBook } from "../../project/shelf.js";
import { platform } from "../platform.js";

export function useShelf(libraryDir: string | null, knownProjects: string[]) {
  const [books, setBooks] = useState<ShelfBook[] | null>(null);
  const known = knownProjects.join("\n");
  const reload = useCallback(async () => {
    setBooks(await readShelf(platform.fileSystem, libraryDir, known ? known.split("\n") : []));
  }, [libraryDir, known]);
  useEffect(() => {
    void reload();
    if (!libraryDir) return;
    const stopWatching = platform.watchFolder(libraryDir, () => void reload());
    return () => void stopWatching.then((stop) => stop());
  }, [libraryDir, reload]);
  return books;
}
