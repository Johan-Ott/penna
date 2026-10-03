import { useCallback, useEffect, useState } from "react";
import { DEMO_PROJECT_DIR } from "../demo/demoProject.js";
import { manuscriptSceneIds, type NodeKind } from "../project/tree.js";
import { chapterOf } from "../project/treeLabels.js";
import { ConflictDialog } from "./ConflictDialog.js";
import { platform } from "./platform.js";
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
import { Sidebar } from "./Sidebar.js";
import type { Placement } from "./tree/treeMenus.js";
import { useProject, type Project } from "./useProject.js";
import { useProjectActions } from "./useProjectActions.js";
import { useSceneSession } from "./useSceneSession.js";
import { useWritingSettings } from "./useWritingSettings.js";
import { Welcome } from "./Welcome.js";
import { WritingArea } from "./WritingArea.js";

// In a browser the example project opens by itself; a project opens on its first scene.
function useStartProject(
  open: (dir: string) => Promise<void>,
  project: Project | null,
  session: SceneSession,
) {
  useEffect(() => {
    if (platform.isDemo) void open(DEMO_PROJECT_DIR);
  }, [open]);
  // A new project never keeps the previous project's scene open; with no scenes, none is open.
  useEffect(() => {
    if (!project || session.scene?.dir === project.dir) return;
    const firstScene = manuscriptSceneIds(project.tree)[0] ?? project.scenes[0];
    void (firstScene ? openScene(session, project.dir, firstScene) : closeScene(session));
  }, [project, session]);
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
  };

function paletteContextOf(parts: AppParts): PaletteContext | null {
  const { project, session, writingMode } = parts;
  if (!project) return null;
  return {
    project,
    settings: writingMode.settings,
    openScene: (id) => void openScene(session, project.dir, id),
    add: (kind) => parts.treeHandlers.onAdd(kind, null),
    run: parts.editor.run,
    changeSettings: writingMode.onChangeSettings,
    toggleFocusMode: writingMode.onToggleFocus,
    openSearch: () => writingMode.setSearchOpen(true),
    chooseFolder: () => void parts.choose(),
  };
}

function Overlays({ app }: { app: ReturnType<typeof useAppState> }) {
  return (
    <>
      <ConflictLayer {...app} />
      {app.palette.isOpen && (
        <CommandPalette entries={app.palette.entries} onClose={app.palette.close} />
      )}
    </>
  );
}

function useAppState() {
  const sceneState = useSceneSession();
  const { session } = sceneState;
  const onFolderChange = useCallback(() => void checkDisk(session), [session]);
  const projectState = useProject(onFolderChange);
  const { project, open, refresh, updateTree } = projectState;
  useStartProject(open, project, session);
  const actions = useProjectActions({ project, session, updateTree, refresh });
  const writingMode = useWritingMode();
  const treeHandlers = useTreeHandlers(actions);
  const parts = { ...sceneState, ...projectState, writingMode, treeHandlers };
  const palette = usePalette(paletteContextOf(parts));
  return { ...parts, actions, palette };
}

export function App() {
  const app = useAppState();
  const { project, session, scene } = app;
  if (!project) return <Welcome onChooseFolder={() => void app.choose()} />;
  return (
    <div className={app.writingMode.isFocusMode ? "app focus-mode" : "app"}>
      <Sidebar
        project={project}
        openSceneId={scene?.id ?? null}
        onOpenScene={(id) => void openScene(session, project.dir, id)}
        onChangeTree={(tree) => void app.updateTree(tree)}
        onChooseFolder={() => void app.choose()}
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
