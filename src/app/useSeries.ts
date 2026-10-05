import { useCallback, useEffect, useRef, useState } from "react";
import { seriesDirOf } from "../project/series.js";
import { platform } from "./platform.js";
import { readProject, useFolderWatch, useProjectUpdates, type Project } from "./useProject.js";

// Reading a missing series folder would write a new project.json there, so it is left alone.
async function readSeries(dir: string | null) {
  if (!dir || !(await platform.folderExists(dir))) return null;
  return readProject(dir).catch(() => null);
}

/** Null when the book is in no series. */
export function useSeries(book: Project | null, onFolderChange: () => void) {
  const dir = book ? seriesDirOf(book.dir, book.fields) : null;
  const [series, setSeries] = useState<Project | null>(null);
  const seriesRef = useRef<Project | null>(null);
  seriesRef.current = series;
  const updates = useProjectUpdates(seriesRef, setSeries);
  // Only the read for the book still open may land.
  const dirRef = useRef(dir);
  dirRef.current = dir;
  const refresh = useCallback(async () => {
    const fresh = await readSeries(dir);
    if (dirRef.current === dir) setSeries(fresh);
  }, [dir]);
  useEffect(() => void refresh(), [refresh]);
  useFolderWatch(dir, refresh, onFolderChange);
  return {
    series,
    refreshSeries: refresh,
    updateSeriesTree: updates.updateTree,
    updateSeriesFields: updates.updateFields,
    updateSeries: updates.updateProject,
  };
}
