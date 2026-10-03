import { useCallback } from "react";
import type { TreeNode } from "../project/tree.js";
import type { SceneFileRef } from "../storage/syncFiles.js";
import { chapterOf } from "../project/treeLabels.js";
import { checkDisk, closeScene, type OpenScene, type SceneSession } from "./sceneSession.js";
import type { PaletteContext } from "./palette/paletteEntries.js";
import { usePalette } from "./palette/usePalette.js";
import { Sidebar } from "./Sidebar.js";
import { ProgressView } from "./progress/ProgressView.js";
import { useProject, type Project } from "./useProject.js";
import { useProjectActions, useTreeHandlers } from "./useProjectActions.js";
import { openIfOnDisk, useOpenFirstScene, useSceneSession } from "./useSceneSession.js";
import { useWritingMode } from "./useWritingMode.js";
import { useWritingStats } from "./useWritingStats.js";
import { useManuscriptSearch } from "./useManuscriptSearch.js";
import { ReplaceToast } from "./SaveToast.js";
import { StartScreen } from "./StartScreen.js";
import { useSyncCopy } from "./SyncLayer.js";
import { useStartup, type PreferenceChange } from "./useStartup.js";
import { WritingArea } from "./WritingArea.js";
import { Overlays } from "./Overlays.js";
import { useSnapshots } from "./snapshots/useSnapshots.js";
import { snapshotOnSave } from "../project/snapshots.js";
import { platform } from "./platform.js";

// The path above the text, and the chapter heading that opens a chapter's first scene.
function sceneHeadings(project: Project, scene: OpenScene | null) {
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const chapterPart = chapter ? [`Kapitel ${chapter.number} · ${chapter.title}`] : [];
  const sceneTitle = scene?.title ?? "";
  return {
    breadcrumb: [project.name, ...chapterPart, sceneTitle].filter((part) => part !== ""),
    hasScene: scene !== null,
    focusLocation: chapter ? `Kapitel ${chapter.number} · ${sceneTitle}` : sceneTitle,
    chapterHeading: chapter?.isFirstScene ? chapter : null,
  };
}

type AppParts = ReturnType<typeof useSceneSession> &
  ReturnType<typeof useProject> & {
    writingMode: ReturnType<typeof useWritingMode>;
    treeHandlers: ReturnType<typeof useTreeHandlers>;
    showShelf: () => Promise<void>;
    snapshots: ReturnType<typeof useSnapshots>;
  };

function paletteContextOf(parts: AppParts): PaletteContext | null {
  const { project, session, writingMode } = parts;
  if (!project) return null;
  return {
    project,
    settings: writingMode.settings,
    openScene: (id) => {
      writingMode.setView("skriv");
      openIfOnDisk(session, project, id);
    },
    add: (kind) => parts.treeHandlers.onAdd(kind, null),
    run: parts.editor.run,
    changeSettings: writingMode.onChangeSettings,
    toggleFocusMode: writingMode.onToggleFocus,
    openSearch: () => writingMode.setSearchOpen(true),
    chooseFolder: () => void parts.choose(),
    showShelf: () => void parts.showShelf(),
    showSnapshots: parts.scene ? () => parts.snapshots.show(parts.scene?.id ?? "") : null,
    openSettings: writingMode.settingsDialog.open,
    showView: writingMode.setView,
  };
}

// Back to the shelf: the scene is saved first, and a failed save keeps the project open.
function useShowShelf(
  session: SceneSession,
  close: () => void,
  update: (change: PreferenceChange) => void,
) {
  return useCallback(async () => {
    if (!(await closeScene(session))) return;
    update((current) => ({ ...current, lastProjectDir: null }));
    close();
  }, [session, close, update]);
}

// Each scene save feeds the words-per-day count and the automatic snapshots.
function listenToSaves(
  savedRef: ReturnType<typeof useSceneSession>["savedRef"],
  recordSave: (dir: string, before: string, after: string) => void,
  isAutoSnapshotOn: boolean,
) {
  savedRef.current = (scene, before, after) => {
    recordSave(scene.dir, before, after);
    if (!isAutoSnapshotOn) return;
    // A missed automatic snapshot loses no text, so it is not shown as an error.
    void snapshotOnSave(platform.fileSystem, scene, { before, after }, Date.now()).catch(
      () => undefined,
    );
  };
}

function useAppState() {
  const sceneState = useSceneSession();
  const { session } = sceneState;
  const onFolderChange = useCallback(() => void checkDisk(session), [session]);
  const projectState = useProject(onFolderChange);
  const { project, open, refresh, updateTree } = projectState;
  const startup = useStartup(open, project?.dir ?? null);
  useOpenFirstScene(project, session, sceneState.editor.requestFocus);
  const actions = useProjectActions({ project, session, updateTree, refresh });
  const writingMode = useWritingMode();
  const treeHandlers = useTreeHandlers(actions);
  const showShelf = useShowShelf(session, projectState.close, startup.updatePreferences);
  const snapshots = useSnapshots(project, session);
  const parts = { ...sceneState, ...projectState, writingMode, treeHandlers, showShelf, snapshots };
  const palette = usePalette(paletteContextOf(parts));
  const syncCopy = useSyncCopy(project, session, updateTree, refresh);
  const { stats, today, recordSave } = useWritingStats(project);
  const search = useManuscriptSearch({
    ...sceneState,
    project,
    refresh,
    isSearchOpen: writingMode.isSearchOpen,
  });
  listenToSaves(sceneState.savedRef, recordSave, startup.preferences.isAutoSnapshotOn);
  return { ...parts, actions, palette, startup, syncCopy, stats, today, search };
}

function sidebarProps(app: ReturnType<typeof useAppState>, project: Project) {
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

function writingAreaProps(app: ReturnType<typeof useAppState>, project: Project) {
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
    onRetrySave: () => void app.session.autosave.flush(),
    onNewScene: () => void app.actions.newItem("scene"),
  };
}

export function App() {
  const app = useAppState();
  const { project } = app;
  if (app.startup.isStarting) return <div className="app-starting" />;
  if (!project) return <StartScreen app={app} />;
  return (
    <div className={app.writingMode.isFocusMode ? "app focus-mode" : "app"}>
      <Sidebar {...sidebarProps(app, project)} />
      <WritingArea {...writingAreaProps(app, project)} />
      {app.writingMode.view === "framsteg" && (
        <ProgressView
          project={project}
          stats={app.stats}
          onSaveGoals={(fields) => void app.updateFields(fields)}
        />
      )}
      <Overlays app={app} />
    </div>
  );
}
