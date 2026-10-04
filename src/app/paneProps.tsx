import type { TreeNode } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import type { AppState } from "./App.js";
import { NoteHeader, NoteMentions, noteSortOf } from "./notes/NotePage.js";
import { ReplaceToast } from "./SaveToast.js";
import { ReviewLayer } from "./review/ReviewLayer.js";
import { SelectionBar } from "./SelectionBar.js";
import { TextHeader } from "./TextHeader.js";
import { openIfOnDisk } from "./useSceneSession.js";
import type { OpenScene } from "./sceneSession.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

const openText = (app: AppState, project: Project) => (id: string) => {
  app.writingMode.setView("skriv");
  openIfOnDisk(app.session, project, id);
};

// "Kapitel 8 · Köket" in the focus mode's header.
function focusLocation(project: Project, scene: OpenScene | null) {
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const title = scene?.title ?? "";
  return chapter ? t("Kapitel {number} · {title}", { number: chapter.number, title }) : title;
}

// A note gets its sort, name, connections and mentions; a scene its chapter and when.
function textParts(app: AppState, project: Project) {
  const scene = app.scene;
  if (!scene) return { header: null, footer: null };
  const onChangeTree = (tree: TreeNode[]) => void app.updateTree(tree);
  const sortId = noteSortOf(project, scene.id);
  if (sortId === null) {
    return {
      header: <TextHeader project={project} sceneId={scene.id} onChangeTree={onChangeTree} />,
      footer: null,
    };
  }
  const noteProps = {
    project,
    noteId: scene.id,
    notes: app.notes,
    onOpen: openText(app, project),
    onSaveFields: (fields: Record<string, unknown>) => void app.updateFields(fields),
  };
  return {
    header: <NoteHeader {...noteProps} sortId={sortId} />,
    footer: <NoteMentions {...noteProps} />,
  };
}

/** What the sidebar is given from the app's state. */
export function sidebarProps(app: AppState, project: Project) {
  const { writingMode } = app;
  return {
    project,
    openSceneId: writingMode.view === "skriv" ? (app.scene?.id ?? null) : null,
    onOpenScene: openText(app, project),
    isContentsShown: writingMode.view === "innehall",
    onShowContents: () => writingMode.setView("innehall"),
    onShowSyncCopy: (copy: SceneFileRef) => void app.syncCopy.showSyncCopy(copy),
    onShowSnapshots: app.snapshots.show,
    onChangeTree: (tree: TreeNode[]) => void app.updateTree(tree),
    onShowShelf: () => void app.showShelf(),
    onNewNote: (sortId: string | null) => app.setNewNoteSort(sortId),
    ...app.treeHandlers,
    onSetNoteLink: (id: string, isLinked: boolean) => void app.actions.notes.setLink(id, isLinked),
  };
}

/** What the writing area is given from the app's state. */
export function writingAreaProps(app: AppState, project: Project) {
  return {
    editor: app.editor,
    isReadOnly: project.isReadOnly,
    isHidden: app.writingMode.view !== "skriv",
    hasScene: app.scene !== null,
    focusLocation: focusLocation(project, app.scene),
    ...textParts(app, project),
    ...app.writingMode,
    saveStatus: app.saveStatus,
    today: app.today,
    treeFailure: app.treeFailure,
    manuscriptSearch: app.search.scope,
    replaceToast: <ReplaceToast {...app.search} />,
    aside: <ReviewLayer app={app} project={project} />,
    selectionBar: <SelectionBar editor={app.editor} onComment={app.comments.start} />,
    onRetrySave: () => void app.session.autosave.flush(),
    onNewScene: () => void app.actions.newItem("scene"),
  };
}
