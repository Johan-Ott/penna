import { parentOf } from "../../project/libraryFolders.js";
import { writeProjectFile } from "../../project/projectFile.js";
import { createSeries, moveNotesToSeries } from "../../project/series.js";
import { withSpecialFolders, type TreeNode } from "../../project/tree.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import { closeScene, openScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

type Change = { tree?: TreeNode[]; fields?: Record<string, unknown> };

interface SeriesActionsInput {
  book: Project | null;
  series: Project | null;
  session: SceneSession;
  updateBook: (change: Change) => Promise<void>;
  updateSeries: (change: Change) => Promise<void>;
  refreshSeries: () => Promise<void>;
}

// Closed first, so its autosave never writes to the old place.
async function closeIfOpen(session: SceneSession, ids: string[]) {
  const openId = session.scene?.id ?? null;
  const isMoving = openId !== null && ids.includes(openId);
  if (isMoving && !(await closeScene(session))) return { canMove: false, reopen: null };
  return { canMove: true, reopen: isMoving ? openId : null };
}

async function moveToSeries(input: SeriesActionsInput, ids: string[]) {
  const { book, series, session } = input;
  if (!book || !series || book.isReadOnly) return;
  const { canMove, reopen } = await closeIfOpen(session, ids);
  if (!canMove) return;
  const moved = await moveNotesToSeries(platform.fileSystem, book, series, ids);
  await input.updateSeries({ tree: moved.seriesTree, fields: moved.seriesFields });
  await input.updateBook({ tree: moved.bookTree });
  await input.refreshSeries();
  if (reopen) await openScene(session, series.dir, reopen);
}

async function createAndJoin(input: SeriesActionsInput, title: string, noteIds: string[]) {
  const { book, session } = input;
  if (!book || book.isReadOnly) return;
  const { canMove, reopen } = await closeIfOpen(session, noteIds);
  const dir = parentOf(book.dir);
  const folder = await createSeries(platform.fileSystem, dir, title);
  const series = {
    dir: joinPath(dir, folder),
    fields: { title, type: "serie" },
    tree: withSpecialFolders([]),
  };
  const ids = canMove ? noteIds : [];
  const moved = await moveNotesToSeries(platform.fileSystem, book, series, ids);
  await writeProjectFile(platform.fileSystem, series.dir, moved.seriesFields, moved.seriesTree);
  await input.updateBook({ tree: moved.bookTree, fields: { series: folder } });
  if (reopen) await openScene(session, series.dir, reopen);
}

export function useSeriesActions(input: SeriesActionsInput) {
  return {
    moveToSeries: (ids: string[]) => moveToSeries(input, ids),
    joinSeries: (folder: string | null) => input.updateBook({ fields: { series: folder } }),
    createAndJoin: (title: string, noteIds: string[]) => createAndJoin(input, title, noteIds),
  };
}
