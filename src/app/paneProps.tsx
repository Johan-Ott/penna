import { PersonSecrets, SecretPanel } from "./notes/SecretPanel.js";
import type { ProjectChange } from "./labels/LabelsDialog.js";
import { BesidePane } from "./beside/BesidePane.js";
import { CHARACTERS_ID, SECRETS_ID, type TreeNode } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import type { AppState } from "./App.js";
import { NoteHeader, NoteMentions, noteSortOf, type NotePageProps } from "./notes/NotePage.js";
import { ReviewLayer } from "./review/ReviewLayer.js";
import { FootnotePopover } from "./FootnotePopover.js";
import { SelectionBar } from "./SelectionBar.js";
import { TextHeader } from "./TextHeader.js";
import { openInHome } from "./notes/noteHomes.js";
import { SeriesNotes } from "./tree/TreeView.js";
import type { OpenScene } from "./sceneSession.js";
import type { Project } from "./useProject.js";
import { t } from "../i18n/i18n.js";

const openText = (app: AppState) => (id: string) => {
  app.writingMode.setView("skriv");
  openInHome(app.session, app.homes, id);
};

function focusLocation(project: Project, scene: OpenScene | null) {
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const title = scene?.title ?? "";
  return chapter ? t("Kapitel {number} · {title}", { number: chapter.number, title }) : title;
}

function sceneHeader(app: AppState, project: Project, sceneId: string) {
  return (
    <TextHeader
      project={project}
      sceneId={sceneId}
      onChangeTree={(tree: TreeNode[]) => void app.updateTree(tree)}
      onReadChapter={(chapterId) => app.writingMode.read(chapterId)}
      onShowVersions={app.snapshots.show}
    />
  );
}

// A secret's page says who learns it when; a person's page what they know. Book notes only.
function SecretParts(props: NotePageProps & { sortId: string; app: AppState }) {
  const parts = { ...props, onChangeTree: (tree: TreeNode[]) => void props.app.updateTree(tree) };
  if (props.sortId === SECRETS_ID) return <SecretPanel {...parts} />;
  if (props.sortId === CHARACTERS_ID) return <PersonSecrets {...parts} />;
  return null;
}

function textParts(app: AppState, project: Project) {
  const scene = app.scene;
  if (!scene) return { header: null, footer: null };
  const home = app.homes.find((candidate) => noteSortOf(candidate, scene.id) !== null);
  const sortId = home ? noteSortOf(home, scene.id) : null;
  if (!home || sortId === null)
    return { header: sceneHeader(app, project, scene.id), footer: null };
  const isInSeries = home !== project;
  const noteProps = {
    project: home,
    book: project,
    noteId: scene.id,
    notes: app.notes,
    onOpen: openText(app),
    onSaveFields: (fields: Record<string, unknown>) =>
      void (isInSeries ? app.seriesState.updateSeriesFields(fields) : app.updateFields(fields)),
  };
  return {
    header: <NoteHeader {...noteProps} sortId={sortId} />,
    footer: (
      <>
        {!isInSeries && <SecretParts {...noteProps} sortId={sortId} app={app} />}
        <NoteMentions {...noteProps} />
      </>
    ),
  };
}

export function sidebarProps(app: AppState, project: Project) {
  const { writingMode } = app;
  return {
    project,
    openSceneId: writingMode.view === "skriv" ? (app.scene?.id ?? null) : null,
    onOpenScene: openText(app),
    isContentsShown: writingMode.view === "innehall",
    onShowContents: () => writingMode.setView("innehall"),
    syncReviewCount: app.syncReview.items.length,
    onShowSyncReview: () => writingMode.setView("synk"),
    ...{ onShowSnapshots: app.snapshots.show, onShowDrafts: app.drafts.show },
    onOpenBeside: (id: string) =>
      app.writingMode.setBeside({ kind: "text", dir: project.dir, sceneId: id }),
    onChangeTree: (tree: TreeNode[]) => void app.updateTree(tree),
    onUpdateProject: (change: ProjectChange) => void app.updateProject(change),
    onShowShelf: () => void app.showShelf(),
    onNewNote: (sortId: string | null) => app.setNewNoteSort(sortId),
    ...app.treeHandlers,
    onSetNoteLink: (id: string, isLinked: boolean) => void app.actions.notes.setLink(id, isLinked),
    seriesNotes: app.series && <SeriesNotes {...seriesTreeProps(app, app.series)} />,
    canMergeOpenScene: app.sceneSplit.canMerge,
    onMergeWithNext: app.sceneSplit.merge,
    onJoinSeries: (folder: string | null) => void app.seriesChoice.joinSeries(folder),
    onCreateSeries: (title: string, noteIds: string[]) =>
      void app.seriesChoice.createAndJoin(title, noteIds),
    ...(app.series
      ? { onMoveToSeries: (id: string) => void app.seriesChoice.moveToSeries([id]) }
      : {}),
  };
}

export function seriesTreeProps(app: AppState, series: Project) {
  const { actions, writingMode } = app;
  return {
    project: series,
    name: series.name,
    openSceneId: writingMode.view === "skriv" ? (app.scene?.id ?? null) : null,
    onOpenScene: openText(app),
    onChangeTree: (tree: TreeNode[]) => void app.seriesState.updateSeriesTree(tree),
    onShowSnapshots: (id: string) => app.snapshots.show(id, series.dir),
    onOpenBeside: (id: string) =>
      app.writingMode.setBeside({ kind: "text", dir: series.dir, sceneId: id }),
    onNewNote: (sortId: string | null) => app.setNewNoteSort(sortId),
    ...app.seriesTreeHandlers,
    onSetNoteLink: (id: string, isLinked: boolean) =>
      void actions.series.notes.setLink(id, isLinked),
  };
}

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
    aside: <ReviewLayer app={app} project={project} />,
    beside: <BesidePane app={app} project={project} />,
    selectionBar: (
      <>
        <SelectionBar editor={app.editor} onComment={app.comments.start} />
        <FootnotePopover editor={app.editor} />
      </>
    ),
    onRetrySave: () => void app.session.autosave.flush(),
    onSaveNow: app.session.autosave.flush,
    onNewScene: () => void app.actions.newItem("scene"),
  };
}
