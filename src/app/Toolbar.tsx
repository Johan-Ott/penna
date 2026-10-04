import type { SaveStatus } from "../storage/autosave.js";

interface ToolbarProps {
  saveStatus: SaveStatus | null;
  wordCount: number;
  breadcrumb: string[];
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onEnterFocus: () => void;
}

function SaveIndicator({ saveStatus }: { saveStatus: SaveStatus | null }) {
  const isFailed = saveStatus?.kind === "failed";
  return (
    <span
      className={isFailed ? "save-indicator failed" : "save-indicator"}
      title="Sparat i din mapp. Används aldrig för AI-träning."
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
      {isFailed ? "Inte sparat" : "Sparat lokalt"}
    </span>
  );
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="toolbar">
      <nav className="breadcrumb" aria-label="Plats">
        {props.breadcrumb.map((part, index) => (
          <span
            key={part + String(index)}
            className={index === props.breadcrumb.length - 1 ? "current" : ""}
          >
            {part}
          </span>
        ))}
      </nav>
      <div className="toolbar-actions">
        <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
        <ToolbarEnd {...props} />
      </div>
    </header>
  );
}

export function SettingsButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      className="icon-button settings-button"
      aria-label="Skrivinställningar"
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      Aa
    </button>
  );
}

function ToolbarEnd(props: ToolbarProps) {
  return (
    <>
      <SaveIndicator saveStatus={props.saveStatus} />
      <span className="word-count">{props.wordCount.toLocaleString("sv-SE")} ord</span>
      <button className="button secondary small" onClick={props.onEnterFocus} title="Ctrl+Shift+F">
        Fokusläge
      </button>
    </>
  );
}
