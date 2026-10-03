import {
  findNext,
  findPrev,
  getMatchHighlights,
  replaceAll,
  replaceNext,
  SearchQuery,
  setSearchState,
} from "prosemirror-search";
import type { Command, EditorState } from "prosemirror-state";
import { useEffect, useState, type KeyboardEvent } from "react";

interface SearchPanelProps {
  editorState: EditorState | null;
  run: (command: Command, shouldFocus?: boolean) => void;
  onClose: () => void;
}

const applyQuery =
  (query: SearchQuery): Command =>
  (state, dispatch) => {
    dispatch?.(setSearchState(state.tr, query));
    return true;
  };

function matchPosition(editorState: EditorState | null) {
  if (!editorState) return { total: 0, current: 0 };
  const matches = getMatchHighlights(editorState).find();
  const index = matches.findIndex((match) => match.from === editorState.selection.from);
  return { total: matches.length, current: index + 1 };
}

function useSearchQuery(run: SearchPanelProps["run"]) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  useEffect(() => {
    run(applyQuery(new SearchQuery({ search, replace, wholeWord, caseSensitive })), false);
  }, [run, search, replace, wholeWord, caseSensitive]);
  useEffect(() => () => run(applyQuery(new SearchQuery({ search: "" })), false), [run]);
  const options = { wholeWord, setWholeWord, caseSensitive, setCaseSensitive };
  return { search, setSearch, replace, setReplace, ...options };
}

type SearchQueryState = ReturnType<typeof useSearchQuery>;

function FindRow(props: {
  query: SearchQueryState;
  editorState: EditorState | null;
  onKey: (event: KeyboardEvent) => void;
}) {
  const { total, current } = matchPosition(props.editorState);
  return (
    <div className="search-row">
      <input
        autoFocus
        aria-label="Sök"
        placeholder="Sök"
        value={props.query.search}
        onChange={(event) => props.query.setSearch(event.target.value)}
        onKeyDown={props.onKey}
      />
      <span className="search-count">
        {total === 0 ? "Inga träffar" : `${current || "–"} av ${total}`}
      </span>
    </div>
  );
}

function ReplaceRow(props: {
  query: SearchQueryState;
  run: SearchPanelProps["run"];
  onClose: () => void;
}) {
  return (
    <div className="search-row">
      <input
        aria-label="Ersätt med"
        placeholder="Ersätt med"
        value={props.query.replace}
        onChange={(event) => props.query.setReplace(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          event.preventDefault();
          props.onClose();
        }}
      />
      <button className="button secondary small" onClick={() => props.run(replaceNext, false)}>
        Ersätt
      </button>
      <button className="button secondary small" onClick={() => props.run(replaceAll, false)}>
        Alla
      </button>
    </div>
  );
}

function SearchOptions({ query }: { query: SearchQueryState }) {
  return (
    <div className="search-options">
      <button
        className="chip"
        aria-pressed={query.wholeWord}
        onClick={() => query.setWholeWord(!query.wholeWord)}
      >
        Hela ord
      </button>
      <button
        className="chip"
        aria-pressed={query.caseSensitive}
        aria-label="Skilj på stora och små bokstäver"
        onClick={() => query.setCaseSensitive(!query.caseSensitive)}
      >
        Aa
      </button>
    </div>
  );
}

export function SearchPanel({ editorState, run, onClose }: SearchPanelProps) {
  const query = useSearchQuery(run);
  const onSearchKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
    if (event.key === "Enter") run(event.shiftKey ? findPrev : findNext, false);
  };
  return (
    <div className="search-panel" role="search">
      <FindRow query={query} editorState={editorState} onKey={onSearchKey} />
      <ReplaceRow query={query} run={run} onClose={onClose} />
      <SearchOptions query={query} />
    </div>
  );
}
