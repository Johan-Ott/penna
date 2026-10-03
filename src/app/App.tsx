import { useCallback, useEffect, useState } from "react";
import { manuscriptSceneIds, type NodeKind } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import { ConflictDialog } from "./ConflictDialog.js";
import {
  checkDisk,
  closeScene,
  openScene,
  resolveConflict,
  type DiskConflict,
  type OpenScene,
  type SceneSession,
} from "./sceneSession.js";
import { CommandPalette } from "./palette/CommandPalette.js";
import type { PaletteContext } from "./palette/paletteEntries.js";
import { usePalette } from "./palette/usePalette.js";
import type { SceneStatus } from "../manuscript/sceneFile.js";
import { Sidebar } from "./Sidebar.js";
import type { Placement } from "./tree/treeMenus.js";
import { useProject, type Project } from "./useProject.js";
import { useProjectActions } from "./useProjectActions.js";
import { useSceneSession } from "./useSceneSession.js";
import { useWritingSettings } from "./useWritingSettings.js";
import { StartScreen } from "./StartScreen.js";
import { CrashDialog, SyncCopyDialog, useSyncCopy } from "./SyncLayer.js";
import { useStartup, type PreferenceChange } from "./useStartup.js";
import { WritingArea } from "./WritingArea.js";

// A scene still in the cloud has no text here yet, so it cannot open.
function openIfOnDisk(session: SceneSession, project: Project, id: string) {
  if (project.scenes.includes(id)) void openScene(session, project.dir, id);
}

// A project opens on its first scene with the cursor ready. A new project never keeps the
// previous project's scene open; with no scenes, none is open. Crash text is settled first.
function useOpenFirstScene(
  project: Project | null,
  session: SceneSession,
  focusEditor: () => void,
) {
  useEffect(() => {
    if (!project || session.scene?.dir === project.dir || project.recoverable.length > 0) return;
    const onDisk = manuscriptSceneIds(project.tree).filter((id) => project.scenes.includes(id));
    const firstScene = onDisk[0] ?? project.scenes[0];
    if (!firstScene) return void closeScene(session);
    void openScene(session, project.dir, firstScene).then(focusEditor);
  }, [project, session, focusEditor]);
}

function ConflictLayer(props: {
  conflict: DiskConflict | null;
  scene: OpenScene | null;
  session: SceneSession;
  refresh: () => Promise<void>;
}) {
  const { conflict, scene, session } = props;
  if (!conflict || !scene) return null;
  return (
    <ConflictDialog
      sceneTitle={scene.title}
      conflict={conflict}
      onChoose={(choice) => void resolveConflict(session, choice, conflict).then(props.refresh)}
    />
  );
}

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

function useWritingMode() {
  const { settings, update } = useWritingSettings();
  const [isFocusMode, setFocusMode] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const onToggleFocus = useCallback(() => setFocusMode((current) => !current), []);
  return {
    settings,
    onChangeSettings: update,
    isFocusMode,
    onToggleFocus,
    isSearchOpen,
    setSearchOpen,
  };
}

// New chapters, parts and folders start with their name ready to type; scenes open in the editor.
function useTreeHandlers(actions: ReturnType<typeof useProjectActions>) {
  const [renameRequestId, setRenameRequestId] = useState<string | null>(null);
  return {
    renameRequestId,
    onRenameScene: (id: string, title: string) => void actions.renameSceneTitle(id, title),
    onSetSceneStatus: (id: string, status: SceneStatus) => void actions.setStatus(id, status),
    onAdd: (kind: NodeKind, placement: Placement) =>
      void actions.newItem(kind, placement).then((id) => {
        if (id && kind !== "scene") setRenameRequestId(id);
      }),
  };
}

function writingHandlers(session: SceneSession, actions: ReturnType<typeof useProjectActions>) {
  return {
    onRetrySave: () => void session.autosave.flush(),
    onNewScene: () => void actions.newItem("scene"),
  };
}

type AppParts = ReturnType<typeof useSceneSession> &
  ReturnType<typeof useProject> & {
    writingMode: ReturnType<typeof useWritingMode>;
    treeHandlers: ReturnType<typeof useTreeHandlers>;
    showShelf: () => Promise<void>;
  };

function paletteContextOf(parts: AppParts): PaletteContext | null {
  const { project, session, writingMode } = parts;
  if (!project) return null;
  return {
    project,
    settings: writingMode.settings,
    openScene: (id) => openIfOnDisk(session, project, id),
    add: (kind) => parts.treeHandlers.onAdd(kind, null),
    run: parts.editor.run,
    changeSettings: writingMode.onChangeSettings,
    toggleFocusMode: writingMode.onToggleFocus,
    openSearch: () => writingMode.setSearchOpen(true),
    chooseFolder: () => void parts.choose(),
    showShelf: () => void parts.showShelf(),
  };
}

function Overlays({ app }: { app: ReturnType<typeof useAppState> }) {
  return (
    <>
      <ConflictLayer {...app} />
      {app.project && <SyncCopyDialog project={app.project} {...app.syncCopy} />}
      {app.project && <CrashDialog project={app.project} refresh={app.refresh} />}
      {app.palette.isOpen && (
        <CommandPalette entries={app.palette.entries} onClose={app.palette.close} />
      )}
    </>
  );
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
  const parts = { ...sceneState, ...projectState, writingMode, treeHandlers, showShelf };
  const palette = usePalette(paletteContextOf(parts));
  const syncCopy = useSyncCopy(project, session, updateTree, refresh);
  return { ...parts, actions, palette, startup, syncCopy };
}

export function App() {
  const app = useAppState();
  const { project, session, scene } = app;
  if (app.startup.isStarting) return <div className="app-starting" />;
  if (!project) return <StartScreen app={app} />;
  return (
    <div className={app.writingMode.isFocusMode ? "app focus-mode" : "app"}>
      <Sidebar
        project={project}
        openSceneId={scene?.id ?? null}
        onOpenScene={(id) => openIfOnDisk(session, project, id)}
        onShowSyncCopy={(copy) => void app.syncCopy.showSyncCopy(copy)}
        onChangeTree={(tree) => void app.updateTree(tree)}
        onShowShelf={() => void app.showShelf()}
        {...app.treeHandlers}
      />
      <WritingArea
        editor={app.editor}
        {...sceneHeadings(project, scene)}
        {...app.writingMode}
        saveStatus={app.saveStatus}
        treeFailure={app.treeFailure}
        {...writingHandlers(session, app.actions)}
      />
      <Overlays app={app} />
    </div>
  );
}
