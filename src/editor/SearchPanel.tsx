import {
  findNext,
  findPrev,
  getMatchHighlights,
  getSearchState,
  replaceAll,
  replaceCurrent,
  replaceNext,
  SearchQuery,
} from "prosemirror-search";
import type { Command, EditorState } from "prosemirror-state";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { applyQuery, type ManuscriptScope } from "./manuscriptSearch.js";

interface SearchPanelProps {
  editorState: EditorState | null;
  run: (command: Command, shouldFocus?: boolean) => void;
  onClose: () => void;
  manuscript?: ManuscriptScope | undefined;
}

function matchPosition(editorState: EditorState | null) {
  if (!editorState) return { total: 0, current: 0 };
  const matches = getMatchHighlights(editorState).find();
  const index = matches.findIndex((match) => match.from === editorState.selection.from);
  return { total: matches.length, current: index + 1 };
}

// Opening another scene gives the editor a fresh state, so the query is put back whenever
// the editor has a different query.
function useSearchQuery(run: SearchPanelProps["run"], editorState: EditorState | null) {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const query = useMemo(
    () => new SearchQuery({ search, replace, wholeWord, caseSensitive }),
    [search, replace, wholeWord, caseSensitive],
  );
  const appliedQuery = editorState ? getSearchState(editorState)?.query : undefined;
  useEffect(() => {
    if (!appliedQuery?.eq(query)) run(applyQuery(query), false);
  }, [run, query, appliedQuery]);
  useEffect(() => () => run(applyQuery(new SearchQuery({ search: "" })), false), [run]);
  const options = { wholeWord, setWholeWord, caseSensitive, setCaseSensitive };
  return { query, search, setSearch, replace, setReplace, ...options };
}

type SearchQueryState = ReturnType<typeof useSearchQuery>;

// One scene or the whole manuscript: the rows below call these and need not know which.
function searchActions(props: SearchPanelProps, query: SearchQuery) {
  const { run, editorState } = props;
  const scope = props.manuscript?.isOn ? props.manuscript : null;
  if (!scope) {
    return {
      position: () => matchPosition(editorState),
      step: (isBackwards: boolean) => run(isBackwards ? findPrev : findNext, false),
      replaceOne: () => run(replaceNext, false),
      replaceEvery: () => run(replaceAll, false),
    };
  }
  return {
    position: () => scope.position(query, editorState),
    step: (isBackwards: boolean) => scope.step(query, isBackwards),
    replaceOne: () => {
      run(replaceCurrent, false);
      scope.step(query, false);
    },
    replaceEvery: () => scope.replaceAll(query),
  };
}

type SearchActions = ReturnType<typeof searchActions>;

function FindRow(props: {
  query: SearchQueryState;
  actions: SearchActions;
  onKey: (event: KeyboardEvent) => void;
}) {
  const { total, current } = props.actions.position();
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
  actions: SearchActions;
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
      <button className="button secondary small" onClick={props.actions.replaceOne}>
        Ersätt
      </button>
      <button className="button primary small" onClick={props.actions.replaceEvery}>
        Alla
      </button>
    </div>
  );
}

function Chip(props: { isOn: boolean; onToggle: () => void; label?: string; children: string }) {
  return (
    <button
      className="chip"
      aria-pressed={props.isOn}
      aria-label={props.label}
      onClick={props.onToggle}
    >
      {props.children}
    </button>
  );
}

function SearchOptions({
  query,
  manuscript,
}: {
  query: SearchQueryState;
  manuscript?: ManuscriptScope | undefined;
}) {
  return (
    <div className="search-options">
      {manuscript && (
        <Chip isOn={manuscript.isOn} onToggle={manuscript.toggle}>
          Hela manuset
        </Chip>
      )}
      <Chip isOn={query.wholeWord} onToggle={() => query.setWholeWord(!query.wholeWord)}>
        Hela ord
      </Chip>
      <Chip
        isOn={query.caseSensitive}
        label="Skilj på stora och små bokstäver"
        onToggle={() => query.setCaseSensitive(!query.caseSensitive)}
      >
        Aa
      </Chip>
    </div>
  );
}

export function SearchPanel(props: SearchPanelProps) {
  const query = useSearchQuery(props.run, props.editorState);
  const actions = searchActions(props, query.query);
  const onSearchKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
    }
    if (event.key === "Enter") actions.step(event.shiftKey);
  };
  return (
    <div className="search-panel" role="search">
      <FindRow query={query} actions={actions} onKey={onSearchKey} />
      <ReplaceRow query={query} actions={actions} onClose={props.onClose} />
      <SearchOptions query={query} manuscript={props.manuscript} />
    </div>
  );
}
