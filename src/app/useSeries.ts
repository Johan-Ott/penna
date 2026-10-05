import { useCallback, useEffect, useRef, useState } from "react";
import { seriesDirOf } from "../project/series.js";
import { platform } from "./platform.js";
import { readProject, useFolderWatch, useProjectUpdates, type Project } from "./useProject.js";

// A series folder that is gone (moved, or on a disk that is not connected) is left alone:
// reading a missing folder would write a new project.json there.
async function readSeries(dir: string | null) {
  if (!dir || !(await platform.folderExists(dir))) return null;
  return readProject(dir).catch(() => null);
}

/**
 * The series the open book belongs to: read like a project, watched like one, and written to
 * through its own project.json. Null when the book is in no series.
 */
export function useSeries(book: Project | null, onFolderChange: () => void) {
  const dir = book ? seriesDirOf(book.dir, book.fields) : null;
  const [series, setSeries] = useState<Project | null>(null);
  const seriesRef = useRef<Project | null>(null);
  seriesRef.current = series;
  const updates = useProjectUpdates(seriesRef, setSeries);
  // Only the read for the book still open may land, as for the book itself.
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
