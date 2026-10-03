import type { SearchQuery } from "prosemirror-search";
import { replaceAll, search, setSearchState } from "prosemirror-search";
import { EditorState, type Command } from "prosemirror-state";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { joinSceneFile, splitSceneFile } from "../manuscript/sceneFile.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";

// Scenes that are not open are searched with the same plugin as the editor, so "Hela ord"
// and "Aa" count exactly as they do in the open scene.

export const applyQuery =
  (query: SearchQuery): Command =>
  (state, dispatch) => {
    dispatch?.(setSearchState(state.tr, query));
    return true;
  };

export const searchableScene = (sceneText: string, query?: SearchQuery) =>
  EditorState.create({
    doc: parseMarkdown(splitSceneFile(sceneText).body),
    plugins: [search(query ? { initialQuery: query } : {})],
  });

export function countMatches(state: EditorState, query: SearchQuery): number {
  if (!query.valid) return 0;
  let count = 0;
  let from = 0;
  for (let match = query.findNext(state, from); match; match = query.findNext(state, from)) {
    count++;
    from = Math.max(match.to, match.from + 1);
  }
  return count;
}

/** Replaces every match in a scene file. Blocks without a match are written back unchanged. */
export function replaceAllInText(sceneText: string, query: SearchQuery) {
  let state = searchableScene(sceneText, query);
  const count = countMatches(state, query);
  if (count === 0) return { text: sceneText, count };
  replaceAll(state, (transaction) => (state = state.apply(transaction)));
  const { frontMatter } = splitSceneFile(sceneText);
  return { text: joinSceneFile({ frontMatter, body: serializeMarkdown(state.doc) }), count };
}

/** What the search panel needs to search the whole manuscript, given by the app. */
export interface ManuscriptScope {
  isOn: boolean;
  toggle: () => void;
  position: (query: SearchQuery, open: EditorState | null) => { current: number; total: number };
  step: (query: SearchQuery, isBackwards: boolean) => void;
  replaceAll: (query: SearchQuery) => void;
}

/** The next scene after `fromId` that has a match, going round; the scene itself comes last. */
export function nextSceneWith(
  ids: string[],
  fromId: string | null,
  isBackwards: boolean,
  hasMatch: (id: string) => boolean,
): string | null {
  const start = fromId === null ? -1 : ids.indexOf(fromId);
  const step = isBackwards ? -1 : 1;
  for (let offset = 1; offset <= ids.length; offset++) {
    const id = ids[(((start + step * offset) % ids.length) + ids.length) % ids.length];
    if (id !== undefined && hasMatch(id)) return id;
  }
  return null;
}
