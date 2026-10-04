import { useCallback, useRef, useState } from "react";
import { checkDisk, closeScene, type SceneSession } from "./sceneSession.js";
import type { PaletteContext } from "./palette/paletteEntries.js";
import { usePalette } from "./palette/usePalette.js";
import { useNotes } from "./notes/useNotes.js";
import { useNoteActions } from "./notes/useNoteActions.js";
import { noteSortOf } from "./notes/NotePage.js";
import { useComments } from "./review/useComments.js";
import { UpdateNotice } from "./UpdateNotice.js";
import { useReminder } from "./reminder.js";
import { useSpellLanguage } from "./useSpellLanguage.js";
import { useMentionLinks } from "./notes/useMentionLinks.js";
import { cardActions } from "./notes/cardActions.js";
import { useProject } from "./useProject.js";
import { useProjectActions, useTreeHandlers } from "./useProjectActions.js";
import { openIfOnDisk, useOpenFirstScene, useSceneSession } from "./useSceneSession.js";
import { useWritingMode } from "./useWritingMode.js";
import { useWritingStats } from "./useWritingStats.js";
import { useManuscriptSearch } from "./useManuscriptSearch.js";
import { StartScreen } from "./StartScreen.js";
import { useSyncCopy } from "./SyncLayer.js";
import { useStartup, type PreferenceChange } from "./useStartup.js";
import { useSnapshots } from "./snapshots/useSnapshots.js";
import { snapshotOnSave } from "../project/snapshots.js";
import { platform } from "./platform.js";
import { useExport } from "./exporting/useExport.js";
import { ProjectScreen } from "./shell/ProjectScreen.js";

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

// Each scene save feeds the words-per-day count and the automatic versions.
function listenToSaves(
  savedRef: ReturnType<typeof useSceneSession>["savedRef"],
  recordSave: (dir: string, before: string, after: string) => void,
  isAutoSnapshotOn: boolean,
) {
  savedRef.current = (scene, before, after) => {
    recordSave(scene.dir, before, after);
    if (!isAutoSnapshotOn) return;
    // A missed automatic version loses no text, so it is not shown as an error.
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
  const input = { project, session, updateTree, refresh };
  const actions = { ...useProjectActions(input), notes: useNoteActions(input) };
  const author = startup.preferences.authorName;
  const comments = useComments({
    project,
    scene: sceneState.scene,
    editor: sceneState.editor,
    author,
  });
  return { sceneState, projectState, startup, actions, comments, writingMode: useWritingMode() };
}

// The notes linked in the text, the open note's mentions, and Ny anteckning.
function useNotesParts(core: ReturnType<typeof useCoreState>) {
  const { projectState, sceneState, writingMode, actions } = core;
  const { project } = projectState;
  const noteId = sceneState.scene?.id ?? null;
  const isNoteOpen = project !== null && noteId !== null && noteSortOf(project, noteId) !== null;
  const notes = useNotes(project, isNoteOpen);
  useMentionLinks(sceneState.editor, notes);
  const [newNoteSort, setNewNoteSort] = useState<string | null | false>(false);
  const { session } = sceneState;
  const cards = cardActions({ project, session, actions, setView: writingMode.setView });
  return { notes, cards, newNoteSort, setNewNoteSort };
}

type PaletteParts = ReturnType<typeof useCoreState> &
  ReturnType<typeof useSceneSession> &
  ReturnType<typeof useProject> &
  ReturnType<typeof useNotesParts> & {
    treeHandlers: ReturnType<typeof useTreeHandlers>;
    showShelf: () => Promise<void>;
    snapshots: ReturnType<typeof useSnapshots>;
  };

function paletteContextOf(app: PaletteParts): PaletteContext | null {
  const { project, session, writingMode } = app;
  if (!project) return null;
  return {
    project,
    settings: writingMode.settings,
    openScene: (id) => {
      writingMode.setView("skriv");
      openIfOnDisk(session, project, id);
    },
    add: (kind) => app.treeHandlers.onAdd(kind, null),
    run: app.editor.run,
    changeSettings: writingMode.onChangeSettings,
    toggleFocusMode: writingMode.onToggleFocus,
    openSearch: () => writingMode.setSearchOpen(true),
    chooseFolder: () => void app.choose(),
    showShelf: () => void app.showShelf(),
    showSnapshots: app.scene ? () => app.snapshots.show(app.scene?.id ?? "") : null,
    openSettings: () => writingMode.settingsDialog.open(),
    showView: writingMode.setView,
    cards: app.notes.cards,
    describe: app.notes.descriptionOf,
    openCard: app.cards.open,
    newNote: () => app.setNewNoteSort(null),
  };
}

function useAppState() {
  const core = useCoreState();
  const { sceneState, projectState, startup, writingMode } = core;
  const { session } = sceneState;
  const { project, refresh, updateTree } = projectState;
  const treeHandlers = useTreeHandlers(core.actions);
  const showShelf = useShowShelf(session, projectState.close, startup.updatePreferences);
  const snapshots = useSnapshots(project, session);
  const syncCopy = useSyncCopy(project, session, updateTree, refresh);
  const { stats, today, recordSave } = useWritingStats(project);
  useReminder(startup.preferences.reminderHour, today.words);
  const isSearchOpen = writingMode.isSearchOpen;
  const search = useManuscriptSearch({ ...sceneState, project, refresh, isSearchOpen });
  listenToSaves(sceneState.savedRef, recordSave, startup.preferences.isAutoSnapshotOn);
  const zip = useExport(project, startup.preferences.authorName, projectState.updateFields);
  const parts = { ...core, ...sceneState, ...projectState, ...useNotesParts(core) };
  const newProjectAsked = useRef(false);
  const app = {
    ...parts,
    ...{ treeHandlers, showShelf, snapshots, syncCopy, stats, today, search, zip, newProjectAsked },
  };
  return { ...app, palette: usePalette(paletteContextOf(app)) };
}

export type AppState = ReturnType<typeof useAppState>;

// The update notice sits outside both screens, so it asks once and stays dismissed.
export function App() {
  const app = useAppState();
  const { project } = app;
  if (app.startup.isStarting) return <div className="app-starting" />;
  return (
    <>
      {project ? <ProjectScreen app={app} project={project} /> : <StartScreen app={app} />}
      <UpdateNotice session={app.session} />
    </>
  );
}
