import { useCallback } from "react";
import { checkDisk, closeScene, type SceneSession } from "./sceneSession.js";
import type { PaletteContext } from "./palette/paletteEntries.js";
import { usePalette } from "./palette/usePalette.js";
import { Sidebar } from "./Sidebar.js";
import { OtherViews } from "./OtherViews.js";
import { CHARACTERS_ID } from "../project/tree.js";
import { usePlanning } from "./planning/usePlanning.js";
import { useComments } from "./review/useComments.js";
import { useSpellLanguage } from "./useSpellLanguage.js";
import { useMentionLinks } from "./planning/useMentionLinks.js";
import { cardActions, type CardActions } from "./planning/cardActions.js";
import { useProject, type Project } from "./useProject.js";
import { useProjectActions, useTreeHandlers } from "./useProjectActions.js";
import { openIfOnDisk, useOpenFirstScene, useSceneSession } from "./useSceneSession.js";
import { useWritingMode } from "./useWritingMode.js";
import { useWritingStats } from "./useWritingStats.js";
import { useManuscriptSearch } from "./useManuscriptSearch.js";
import { StartScreen } from "./StartScreen.js";
import { useSyncCopy } from "./SyncLayer.js";
import { useStartup, type PreferenceChange } from "./useStartup.js";
import { WritingArea } from "./WritingArea.js";
import { sidebarProps, writingAreaProps } from "./paneProps.js";
import { Overlays } from "./Overlays.js";
import { useSnapshots } from "./snapshots/useSnapshots.js";
import { snapshotOnSave } from "../project/snapshots.js";
import { platform } from "./platform.js";

type AppParts = ReturnType<typeof useSceneSession> &
  ReturnType<typeof useProject> & {
    writingMode: ReturnType<typeof useWritingMode>;
    treeHandlers: ReturnType<typeof useTreeHandlers>;
    showShelf: () => Promise<void>;
    snapshots: ReturnType<typeof useSnapshots>;
    planning: ReturnType<typeof usePlanning>;
    cards: CardActions;
  };

// Characters in the palette open their card in the editor.
function planningCommands({ planning, cards }: AppParts) {
  return {
    cards: planning.cards,
    openCard: cards.open,
    newCharacter: () => cards.create(CHARACTERS_ID),
  };
}

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
    ...planningCommands(parts),
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

// The project, the open scene, its comments and how the writer works: what the rest builds on.
function useCoreState() {
  const sceneState = useSceneSession();
  const { session } = sceneState;
  const onFolderChange = useCallback(() => void checkDisk(session), [session]);
  const projectState = useProject(onFolderChange);
  const { project, open, refresh, updateTree } = projectState;
  const startup = useStartup(open, project?.dir ?? null);
  useOpenFirstScene(project, session, sceneState.editor.requestFocus);
  useSpellLanguage(project, session);
  const actions = useProjectActions({ project, session, updateTree, refresh });
  const author = startup.preferences.authorName;
  const comments = useComments({
    project,
    scene: sceneState.scene,
    editor: sceneState.editor,
    author,
  });
  return { sceneState, projectState, startup, actions, comments, writingMode: useWritingMode() };
}

// Planera's cards, linked in the text and opened in the editor like scenes.
function usePlanningParts({
  project,
  sceneState,
  writingMode,
  actions,
}: {
  project: Project | null;
  sceneState: ReturnType<typeof useSceneSession>;
  writingMode: ReturnType<typeof useWritingMode>;
  actions: ReturnType<typeof useProjectActions>;
}) {
  const planning = usePlanning(project, writingMode.view === "planera");
  useMentionLinks(sceneState.editor, planning);
  const { session } = sceneState;
  return {
    planning,
    cards: cardActions({ project, session, actions, setView: writingMode.setView }),
  };
}

function useAppState() {
  const { sceneState, projectState, startup, actions, writingMode, comments } = useCoreState();
  const { session } = sceneState;
  const { project, refresh, updateTree } = projectState;
  const treeHandlers = useTreeHandlers(actions);
  const showShelf = useShowShelf(session, projectState.close, startup.updatePreferences);
  const snapshots = useSnapshots(project, session);
  const { planning, cards } = usePlanningParts({ project, sceneState, writingMode, actions });
  const parts = {
    cards,
    ...sceneState,
    ...projectState,
    writingMode,
    treeHandlers,
    showShelf,
    snapshots,
    planning,
  };
  const palette = usePalette(paletteContextOf(parts));
  const syncCopy = useSyncCopy(project, session, updateTree, refresh);
  const { stats, today, recordSave } = useWritingStats(project);
  const isSearchOpen = writingMode.isSearchOpen;
  const search = useManuscriptSearch({ ...sceneState, project, refresh, isSearchOpen });
  listenToSaves(sceneState.savedRef, recordSave, startup.preferences.isAutoSnapshotOn);
  return { ...parts, actions, palette, startup, syncCopy, stats, today, search, comments };
}

export type AppState = ReturnType<typeof useAppState>;

export function App() {
  const app = useAppState();
  const { project } = app;
  if (app.startup.isStarting) return <div className="app-starting" />;
  if (!project) return <StartScreen app={app} />;
  const { isFocusMode, isSidebarOpen, setSidebarOpen } = app.writingMode;
  const classes = ["app", isFocusMode && "focus-mode", isSidebarOpen && "sidebar-open"];
  return (
    <div className={classes.filter(Boolean).join(" ")}>
      <Sidebar {...sidebarProps(app, project)} />
      <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      <WritingArea {...writingAreaProps(app, project)} />
      <OtherViews app={app} project={project} />
      <Overlays app={app} />
    </div>
  );
}
