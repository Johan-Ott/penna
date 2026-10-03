import type { Command, EditorState } from "prosemirror-state";
import type { ReactNode } from "react";
import {
  currentStyle,
  insertSceneBreak,
  isMarkActive,
  toggleBold,
  toggleItalic,
  toggleQuote,
} from "../editor/commands.js";
import type { SaveStatus } from "../storage/autosave.js";
import { StylePicker } from "./StylePicker.js";

interface ToolbarProps {
  editorState: EditorState | null;
  run: (command: Command) => void;
  saveStatus: SaveStatus | null;
  wordCount: number;
  breadcrumb: string[];
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onEnterFocus: () => void;
}

type FormatProps = Pick<ToolbarProps, "editorState" | "run">;

function MarkButton(props: FormatProps & { mark: "bold" | "italic"; label: string }) {
  const isPressed = props.editorState !== null && isMarkActive(props.editorState, props.mark);
  const command = props.mark === "bold" ? toggleBold : toggleItalic;
  return (
    <button
      className={`icon-button ${props.mark}`}
      aria-label={props.label}
      aria-pressed={isPressed}
      onClick={() => props.run(command)}
    >
      {props.mark === "bold" ? "B" : "I"}
    </button>
  );
}

// The settings button sits last in the group, as in the design.
function FormatButtons(props: FormatProps & { settingsButton: ReactNode }) {
  return (
    <div className="toolbar-group" role="toolbar" aria-label="Formatering">
      <MarkButton {...props} mark="bold" label="Fetstil (Ctrl+B)" />
      <MarkButton {...props} mark="italic" label="Kursiv (Ctrl+I)" />
      <StylePicker {...props} />
      <button
        className="icon-button quote"
        aria-label="Citat"
        aria-pressed={props.editorState !== null && currentStyle(props.editorState) === "citat"}
        onClick={() => props.run(toggleQuote)}
      >
        ”
      </button>
      <button
        className="icon-button"
        aria-label="Scenbrytning (Ctrl+Enter)"
        onClick={() => props.run(insertSceneBreak)}
      >
        * * *
      </button>
      {props.settingsButton}
    </div>
  );
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
        <FormatButtons
          editorState={props.editorState}
          run={props.run}
          settingsButton={
            <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
          }
        />
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
