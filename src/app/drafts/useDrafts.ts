import { useState } from "react";
import {
  listDrafts,
  removeDraft,
  restoreDraft,
  saveDraft,
  type Draft,
} from "../../project/drafts.js";
import { manuscriptSceneIds, sceneIdsIn } from "../../project/tree.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { openScene, type SceneSession } from "../sceneSession.js";
import type { Project } from "../useProject.js";

type Book = { project: Project; session: SceneSession; refresh: () => Promise<void> };

// Saved first, so a draft holds what is on screen, and the open scene shows what was put back.
const draftActions = ({ project, session, refresh }: Book) => ({
  save: async (name: string, chapterId: string | null) => {
    if (!(await session.autosave.flush())) return;
    const sceneIds = chapterId
      ? sceneIdsIn(project.tree, chapterId)
      : manuscriptSceneIds(project.tree);
    await saveDraft(platform.fileSystem, project.dir, { name, chapterId, sceneIds }, Date.now());
  },
  restore: async (draft: Draft) => {
    if (!(await session.autosave.flush())) return;
    await restoreDraft(platform.fileSystem, project.dir, draft, Date.now());
    const openId = session.scene?.id;
    if (openId && draft.sceneIds.includes(openId)) await openScene(session, project.dir, openId);
    await refresh();
  },
  remove: (draft: Draft) => removeDraft(platform.fileSystem, project.dir, draft),
});

/** The drafts dialog: open for a chapter, or with null for the whole book. */
export function useDrafts(
  project: Project | null,
  session: SceneSession,
  refresh: () => Promise<void>,
) {
  const [opened, setOpened] = useState<{ chapterId: string | null } | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const reload = async () =>
    project && setDrafts(await listDrafts(platform.fileSystem, project.dir));
  const then = (action: (actions: ReturnType<typeof draftActions>) => Promise<unknown>) => {
    if (project)
      void action(draftActions({ project, session, refresh }))
        .then(reload)
        .catch(recordFailure("Utkast"));
  };
  return {
    opened,
    drafts,
    show: (chapterId: string | null) => (setOpened({ chapterId }), void reload()),
    close: () => setOpened(null),
    save: (name: string, chapterId: string | null) =>
      then((actions) => actions.save(name, chapterId)),
    restore: (draft: Draft) => then((actions) => actions.restore(draft)),
    remove: (draft: Draft) => then((actions) => actions.remove(draft)),
  };
}

export type Drafts = ReturnType<typeof useDrafts>;
