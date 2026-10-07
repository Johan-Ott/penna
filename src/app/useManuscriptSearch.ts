import type { SearchQuery } from "prosemirror-search";
import { findNext, findNextNoWrap, findPrev, findPrevNoWrap } from "prosemirror-search";
import { undo as undoCommand } from "prosemirror-history";
import type { EditorState } from "prosemirror-state";
import { useEffect, useState } from "react";
import type { useEditorView } from "../editor/useEditorView.js";
import {
  applyQuery,
  countMatches,
  nextSceneWith,
  searchableScene,
  type ManuscriptScope,
} from "../editor/manuscriptSearch.js";
import { manuscriptSceneIds } from "../project/tree.js";
import { joinPath } from "../storage/fileSystem.js";
import { replaceInScenes, undoReplace, type SceneChange } from "./manuscriptReplace.js";
import { platform } from "./platform.js";
import { sceneHits } from "./searchHits.js";
import { isKept, searchChips } from "./searchFilter.js";
import { openScene, type SceneSession } from "./sceneSession.js";
import type { Project } from "./useProject.js";

export interface ReplaceDone {
  count: number;
  search: string;
  /** Null when only the open scene changed: then the editor's own undo takes it back. */
  changes: SceneChange[] | null;
}

interface SearchParts {
  project: Project | null;
  session: SceneSession;
  editor: ReturnType<typeof useEditorView>;
  refresh: () => Promise<void>;
  isSearchOpen: boolean;
  /** The chips chosen under the search; none is the whole manuscript. */
  only?: string[];
}

// Scenes still in the cloud have no text here.
const manuscriptIds = (project: Project, only: string[] = []) =>
  manuscriptSceneIds(project.tree).filter(
    (id) => project.scenes.includes(id) && isKept(project, id, only),
  );

async function loadScenes(project: Project) {
  const scenes = new Map<string, EditorState>();
  for (const id of manuscriptIds(project)) {
    const path = joinPath(project.dir, `scenes/${id}.md`);
    const text = await platform.fileSystem.readText(path).catch(() => null);
    if (text !== null) scenes.set(id, searchableScene(text));
  }
  return scenes;
}

/** The open scene as the editor has it; every other scene as it is on disk. */
function useSceneStates(parts: SearchParts, isOn: boolean) {
  const [scenes, setScenes] = useState(new Map<string, EditorState>());
  const { project, isSearchOpen } = parts;
  useEffect(() => {
    if (!project || !isSearchOpen || !isOn) return;
    let isCurrent = true;
    void loadScenes(project).then((loaded) => isCurrent && setScenes(loaded));
    return () => void (isCurrent = false);
  }, [project, isSearchOpen, isOn]);
  return (id: string, open: EditorState | null) =>
    id === parts.session.scene?.id ? open : (scenes.get(id) ?? null);
}

function matchIndex(state: EditorState, query: SearchQuery) {
  let index = 0;
  for (let match = query.findNext(state, 0); match; match = query.findNext(state, match.to)) {
    index++;
    if (match.from === state.selection.from) return index;
  }
  return 0;
}

// Where the open scene's match is counted among all the manuscript's matches.
function positionAcross(parts: StepParts, query: SearchQuery, open: EditorState | null) {
  const { project, session } = parts;
  if (!project) return { current: 0, total: 0 };
  let total = 0;
  let current = 0;
  for (const id of manuscriptIds(project, parts.only)) {
    const state = parts.stateOf(id, open);
    if (!state) continue;
    const index = id === session.scene?.id && open ? matchIndex(open, query) : 0;
    if (index > 0) current = total + index;
    total += countMatches(state, query);
  }
  return { current, total };
}

// Finding, as against replacing: where a match is, the next one, and every scene with one.
function findingActions(parts: StepParts) {
  const { project } = parts;
  return {
    position: (query: SearchQuery, open: EditorState | null) => positionAcross(parts, query, open),
    step: (query: SearchQuery, isBackwards: boolean) => void stepAcross(parts, query, isBackwards),
    hits: (query: SearchQuery, open: EditorState | null) =>
      project
        ? sceneHits(
            project,
            manuscriptIds(project, parts.only),
            (id) => parts.stateOf(id, open),
            query,
          )
        : [],
    openHit: (id: string, query: SearchQuery) => void showMatchIn(parts, id, query, false),
  };
}

export function useManuscriptSearch(searchParts: SearchParts) {
  const [isOn, setOn] = useState(false);
  const [only, setOnly] = useState<string[]>([]);
  const parts = { ...searchParts, only };
  const [replaceDone, setReplaceDone] = useState<ReplaceDone | null>(null);
  const stateOf = useSceneStates(parts, isOn);
  const replaceAll = (query: SearchQuery) =>
    void replaceEverywhere(parts, query).then((done) => done && setReplaceDone(done));
  const chips = (parts.project ? searchChips(parts.project) : []).map((chip) => ({
    ...chip,
    isOn: only.includes(chip.id),
  }));
  const toggleChip = (id: string) =>
    setOnly(only.includes(id) ? only.filter((each) => each !== id) : [...only, id]);

  const replacedInScene = (count: number, search: string) =>
    count > 0 && setReplaceDone({ count, search, changes: null });
  const finding = findingActions({ ...parts, stateOf });
  const scope: ManuscriptScope = {
    ...{ isOn, setOn, ...finding, replaceAll, replacedInScene, chips, toggleChip },
  };
  const undo = () => {
    if (replaceDone?.changes) void undoEverywhere(parts, replaceDone.changes);
    else if (replaceDone) parts.editor.run(undoCommand);
    setReplaceDone(null);
  };
  return { scope, done: replaceDone, onUndo: undo, onDismiss: () => setReplaceDone(null) };
}

type StepParts = SearchParts & {
  stateOf: (id: string, open: EditorState | null) => EditorState | null;
};

function sceneToStepTo(
  parts: StepParts,
  open: EditorState,
  query: SearchQuery,
  isBackwards: boolean,
) {
  const { project, session } = parts;
  if (!project) return null;
  return nextSceneWith(
    manuscriptIds(project, parts.only),
    session.scene?.id ?? null,
    isBackwards,
    (id) => {
      const state = parts.stateOf(id, open);
      return state !== null && countMatches(state, query) > 0;
    },
  );
}

async function stepAcross(parts: StepParts, query: SearchQuery, isBackwards: boolean) {
  const { project, session } = parts;
  const view = parts.editor.viewRef.current;
  if (!project || !view) return;
  const inScene = isBackwards ? findPrevNoWrap : findNextNoWrap;
  if (session.scene && inScene(view.state, view.dispatch)) return;
  const id = sceneToStepTo(parts, view.state, query, isBackwards);
  if (id) await showMatchIn(parts, id, query, isBackwards);
}

async function showMatchIn(parts: StepParts, id: string, query: SearchQuery, isBackwards: boolean) {
  const { project, session, editor } = parts;
  if (!project) return;
  if (id !== session.scene?.id && !(await openScene(session, project.dir, id))) return;
  // A newly opened scene has a fresh editor state without the query.
  editor.run(applyQuery(query), false);
  editor.run(isBackwards ? findPrev : findNext, false);
}

async function replaceEverywhere(parts: SearchParts, query: SearchQuery) {
  const { project, session } = parts;
  if (!project || !(await session.autosave.flush())) return null;
  const { changes, count } = await replaceInScenes(
    platform.fileSystem,
    project.dir,
    manuscriptIds(project, parts.only),
    query,
  );
  await reloadOpenScene(parts, changes);
  return count === 0 ? null : { count, search: query.search, changes };
}

async function undoEverywhere(parts: SearchParts, changes: SceneChange[]) {
  const { project, session } = parts;
  if (!project || !(await session.autosave.flush())) return;
  await undoReplace(platform.fileSystem, project.dir, changes);
  await reloadOpenScene(parts, changes);
}

async function reloadOpenScene(parts: SearchParts, changes: SceneChange[]) {
  const { project, session } = parts;
  const openId = session.scene?.id;
  if (project && openId && changes.some((change) => change.id === openId)) {
    await openScene(session, project.dir, openId);
  }
  await parts.refresh();
}
