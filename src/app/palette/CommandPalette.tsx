import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { inGroups, searchPalette, type PaletteEntry } from "./paletteSearch.js";

interface CommandPaletteProps {
  entries: PaletteEntry[];
  onClose: () => void;
}

const MAX_RESULTS = 40;

function usePaletteSelection(found: PaletteEntry[], onClose: () => void) {
  const [selected, setSelected] = useState(0);
  const choose = (entry: PaletteEntry | undefined) => {
    if (!entry) return;
    onClose();
    entry.run();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step !== undefined)
      setSelected((current) => (current + step + found.length) % Math.max(found.length, 1));
    if (event.key === "Enter") choose(found[selected]);
    if (event.key === "Escape") onClose();
    if (step !== undefined || event.key === "Enter" || event.key === "Escape")
      event.preventDefault();
  };
  return { selected, setSelected, choose, onKeyDown };
}

interface ResultProps {
  found: PaletteEntry[];
  selected: number;
  onHover: (index: number) => void;
  onChoose: (entry: PaletteEntry) => void;
}

function ResultRow({ index, ...props }: ResultProps & { index: number }) {
  const entry = props.found[index];
  if (!entry) return null;
  const startsGroup = entry.group !== props.found[index - 1]?.group;
  return (
    <>
      {startsGroup && <div className="palette-group">{entry.group}</div>}
      <div
        role="option"
        aria-selected={index === props.selected}
        className="palette-row"
        onMouseMove={() => props.onHover(index)}
        onClick={() => props.onChoose(entry)}
      >
        <span>{entry.label}</span>
        <span className="palette-hint">{entry.shortcut ?? entry.hint}</span>
      </div>
    </>
  );
}

function ResultList(props: ResultProps) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector("[aria-selected=true]")?.scrollIntoView({ block: "nearest" });
  }, [props.selected]);
  if (props.found.length === 0) return <p className="palette-empty">Inga träffar</p>;
  return (
    <div className="palette-results" role="listbox" ref={listRef}>
      {props.found.map((entry, index) => (
        <ResultRow key={entry.id} index={index} {...props} />
      ))}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function PaletteInput(props: {
  query: string;
  onQuery: (query: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="palette-search">
      <SearchIcon />
      <input
        autoFocus
        placeholder="Sök scen, kapitel, karaktär eller kommando"
        aria-label="Sök scen, kapitel, karaktär eller kommando"
        value={props.query}
        onChange={(event) => props.onQuery(event.target.value)}
        onKeyDown={props.onKeyDown}
      />
    </label>
  );
}

/** Ctrl+K: jump to a scene or chapter, or run any command, by typing a few letters. */
export function CommandPalette({ entries, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const found = inGroups(searchPalette(entries, query).slice(0, MAX_RESULTS));
  const selection = usePaletteSelection(found, onClose);
  return (
    <div className="palette-backdrop" onPointerDown={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-label="Kommandopalett"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <PaletteInput
          query={query}
          onQuery={(next) => (setQuery(next), selection.setSelected(0))}
          onKeyDown={selection.onKeyDown}
        />
        <ResultList
          found={found}
          selected={selection.selected}
          onHover={selection.setSelected}
          onChoose={selection.choose}
        />
      </div>
    </div>
  );
}
