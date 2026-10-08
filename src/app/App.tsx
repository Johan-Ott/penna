import { useCallback, useMemo, useRef, useState } from "react";
import { checkDisk, closeScene, type SceneSession } from "./sceneSession.js";
import type { PaletteContext } from "./palette/paletteEntries.js";
import { usePalette } from "./palette/usePalette.js";
import { sceneContext } from "./palette/sceneContext.js";
import { useNotes } from "./notes/useNotes.js";
import { useNoteActions } from "./notes/useNoteActions.js";
import { noteSortOf } from "./notes/NotePage.js";
import { useReviewParts } from "./review/useReviewParts.js";
import { UpdateNotice } from "./UpdateNotice.js";
import { useReminder } from "./reminder.js";
import { useMentionLinks } from "./notes/useMentionLinks.js";
import { cardActions } from "./notes/cardActions.js";
import { useProject, type Project } from "./useProject.js";
import { useSeries } from "./useSeries.js";
import { useSeriesActions } from "./notes/useSeriesActions.js";
import { homesOf } from "./notes/noteHomes.js";
import { useProjectActions, useTreeHandlers } from "./useProjectActions.js";
import { useSpelling } from "./spelling/useSpelling.js";
import { BookToasts, useRenameOffer } from "./renameOffer.js";
import { useDrafts, type Drafts } from "./drafts/useDrafts.js";
import { openIfOnDisk, useOpenFirstScene, useSceneSession } from "./useSceneSession.js";
import { useWritingMode } from "./useWritingMode.js";
import { useJourney } from "./journey/useJourney.js";
import { useProfile } from "./profile/useProfile.js";
import { listenToSaves, useWritingStats } from "./useWritingStats.js";
import { useManuscriptSearch } from "./useManuscriptSearch.js";
import { StartScreen } from "./StartScreen.js";
import { useSyncReview } from "./sync/useSyncReview.js";
import { useStartup, type PreferenceChange } from "./useStartup.js";
import { useSnapshots } from "./snapshots/useSnapshots.js";
import { useExport } from "./exporting/useExport.js";
import { ProjectScreen } from "./shell/ProjectScreen.js";
import { PhoneProject } from "./phone/PhoneProject.js";
import { usePhone } from "./phone/usePhone.js";
import { sceneSplitActions } from "./sceneSplitActions.js";

// A failed save keeps the project open, so no text is lost on the way to the shelf.
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

function useSeriesParts(project: Project | null, session: SceneSession, onChange: () => void) {
  const seriesState = useSeries(project, onChange);
  const input = {
    project: seriesState.series,
    session,
    updateTree: seriesState.updateSeriesTree,
    refresh: seriesState.refreshSeries,
  };
  return {
    seriesState,
    seriesActions: { ...useProjectActions(input), notes: useNoteActions(input) },
  };
}

function useCoreState() {
  const sceneState = useSceneSession();
  const { session, editor } = sceneState;
  const onFolderChange = useCallback(() => void checkDisk(session), [session]);
  const projectState = useProject(onFolderChange);
  const { project, open, refresh, updateTree } = projectState;
  const startup = useStartup(open, project?.dir ?? null);
  const { seriesState, seriesActions } = useSeriesParts(project, session, onFolderChange);
  const seriesDir = seriesState.series?.dir ?? null;
  useOpenFirstScene(project, session, editor.requestFocus, seriesDir);
  const input = { project, session, updateTree, refresh, focusEditor: editor.requestFocus };
  const actions = {
    ...useProjectActions(input),
    notes: useNoteActions(input),
    series: seriesActions,
  };
  const review = useReviewParts({ ...sceneState, project, author: startup.preferences.authorName });
  const writingMode = useWritingMode();
  const profile = useProfile(startup.preferences.libraryDir);
  return {
    sceneState,
    projectState,
    seriesState,
    startup,
    actions,
    ...review,
    writingMode,
    profile,
  };
}

function useNotesParts(core: ReturnType<typeof useCoreState>) {
  const { projectState, sceneState, writingMode } = core;
  const { project } = projectState;
  const { series } = core.seriesState;
  const homes = useMemo(() => (project ? homesOf(project, series) : []), [project, series]);
  const noteId = sceneState.scene?.id ?? null;
  const isNoteOpen = noteId !== null && homes.some((home) => noteSortOf(home, noteId) !== null);
  // Innehåll's filter also needs to know where each note is named.
  const notes = useNotes(homes, project, isNoteOpen || writingMode.view === "innehall");
  useMentionLinks(sceneState.editor, notes);
  useSpelling(sceneState.editor, project, notes, {
    isOn: writingMode.settings.spellcheck,
    updateFields: (fields) => void projectState.updateFields(fields),
  });
  const [newNoteSort, setNewNoteSort] = useState<string | null | false>(false);
  const cards = cardActions({ homes, session: sceneState.session, setView: writingMode.setView });
  const seriesChoice = useSeriesActions({
    book: project,
    series,
    session: sceneState.session,
    updateBook: projectState.updateProject,
    updateSeries: core.seriesState.updateSeries,
    refreshSeries: core.seriesState.refreshSeries,
  });
  return { homes, series, notes, cards, newNoteSort, setNewNoteSort, seriesChoice };
}

type PaletteParts = ReturnType<typeof useCoreState> &
  ReturnType<typeof useSceneSession> &
  ReturnType<typeof useProject> &
  ReturnType<typeof useNotesParts> & {
    treeHandlers: ReturnType<typeof useTreeHandlers>;
    showShelf: () => Promise<void>;
    snapshots: ReturnType<typeof useSnapshots>;
    drafts: Drafts;
    sceneSplit: ReturnType<typeof sceneSplitActions>;
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
    openSettings: () => writingMode.settingsDialog.open(),
    showView: writingMode.setView,
    cards: app.notes.cards,
    describe: app.notes.descriptionOf,
    openCard: app.cards.open,
    newNote: () => app.setNewNoteSort(null),
    ...sceneContext({ ...app, project }),
  };
}

function useAppState() {
  const core = useCoreState();
  const { sceneState, projectState, startup, writingMode } = core;
  const { session } = sceneState;
  const { project, refresh, updateTree } = projectState;
  const seriesTreeHandlers = useTreeHandlers(core.actions.series);
  const showShelf = useShowShelf(session, projectState.close, startup.updatePreferences);
  const snapshots = useSnapshots(project, session);
  const drafts = useDrafts(project, session, refresh);
  const syncReview = useSyncReview({ project, session, updateTree, refresh });
  const journey = useJourney(startup.preferences.libraryDir);
  const { stats, today, recordSave } = useWritingStats(project, journey.record);
  useReminder(startup.preferences.reminderHour, today.words);
  const isSearchOpen = writingMode.isSearchOpen;
  const search = useManuscriptSearch({ ...sceneState, project, refresh, isSearchOpen });
  const renameOffer = useRenameOffer(search.scope, project);
  const treeHandlers = useTreeHandlers(core.actions, renameOffer.noteRenamed);
  listenToSaves(sceneState, recordSave, startup.preferences.isAutoSnapshotOn);
  const input = { project, session, editor: sceneState.editor, updateTree, refresh };
  const sceneSplit = sceneSplitActions(input);
  const zip = useExport(project, startup.preferences.authorName, projectState.updateFields);
  const parts = { ...core, ...sceneState, ...projectState, ...useNotesParts(core) };
  const newProjectAsked = useRef(false);
  const app = {
    ...parts,
    ...{ treeHandlers, seriesTreeHandlers, showShelf, snapshots, syncReview, stats, today },
    ...{ search, renameOffer, zip, newProjectAsked, sceneSplit, drafts, journey },
  };
  return { ...app, palette: usePalette(paletteContextOf(app)) };
}

export type AppState = ReturnType<typeof useAppState>;

// Outside both screens, so the update question is asked once per start.
export function App() {
  const app = useAppState();
  const isPhone = usePhone();
  const { project } = app;
  if (app.startup.isStarting) return <div className="app-starting" />;
  return (
    <>
      {project && !isPhone && <ProjectScreen app={app} project={project} />}
      {project && isPhone && <PhoneProject app={app} project={project} />}
      {project && <BookToasts app={app} />}
      {!project && <StartScreen app={app} />}
      <UpdateNotice session={app.session} />
    </>
  );
}
