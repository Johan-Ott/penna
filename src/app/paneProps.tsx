import { ancestorIds, findNode, isSpecialFolder, type TreeNode } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import type { AppState } from "./App.js";
import { ReplaceToast } from "./SaveToast.js";
import { ReviewLayer } from "./review/ReviewLayer.js";
import { SelectionBar } from "./SelectionBar.js";
import { openIfOnDisk } from "./useSceneSession.js";
import type { OpenScene } from "./sceneSession.js";
import type { Project } from "./useProject.js";

// A scene outside the manuscript, such as a card in Karaktärer, shows the folder it lies in.
function placeOf(project: Project, sceneId: string): string[] {
  const chapter = chapterOf(project.tree, sceneId);
  if (chapter) return [`Kapitel ${chapter.number} · ${chapter.title}`];
  const folderId = ancestorIds(project.tree, sceneId)[0];
  const folder = folderId && isSpecialFolder(folderId) ? findNode(project.tree, folderId) : null;
  return folder?.node.title ? [folder.node.title] : [];
}

// The path above the text, and the chapter heading that opens a chapter's first scene.
function sceneHeadings(project: Project, scene: OpenScene | null) {
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const chapterPart = scene ? placeOf(project, scene.id) : [];
  const sceneTitle = scene?.title ?? "";
  return {
    breadcrumb: [project.name, ...chapterPart, sceneTitle].filter((part) => part !== ""),
    hasScene: scene !== null,
    focusLocation: chapter ? `Kapitel ${chapter.number} · ${sceneTitle}` : sceneTitle,
    chapterHeading: chapter?.isFirstScene ? chapter : null,
  };
}

/** What the sidebar is given from the app's state. */
export function sidebarProps(app: AppState, project: Project) {
  const { session, writingMode } = app;
  return {
    project,
    openSceneId: app.scene?.id ?? null,
    onOpenScene: (id: string) => {
      writingMode.setView("skriv");
      openIfOnDisk(session, project, id);
    },
    view: writingMode.view,
    onView: writingMode.setView,
    onShowSyncCopy: (copy: SceneFileRef) => void app.syncCopy.showSyncCopy(copy),
    onShowSnapshots: app.snapshots.show,
    onChangeTree: (tree: TreeNode[]) => void app.updateTree(tree),
    onShowShelf: () => void app.showShelf(),
    today: app.today,
    ...app.treeHandlers,
  };
}

/** What the writing area is given from the app's state. */
export function writingAreaProps(app: AppState, project: Project) {
  return {
    editor: app.editor,
    isHidden: app.writingMode.view !== "skriv",
    ...sceneHeadings(project, app.scene),
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
