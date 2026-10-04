import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { ManuscriptScope } from "../editor/manuscriptSearch.js";
import { refreshRepetitions } from "../editor/repetitionMarks.js";
import { SearchPanel } from "../editor/SearchPanel.js";
import type { useEditorView } from "../editor/useEditorView.js";
import {
  changeSize,
  DEFAULT_SETTINGS,
  proseStyle,
  type WritingSettings,
} from "../editor/writingSettings.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import type { SaveStatus } from "../storage/autosave.js";
import type { SaveFailure } from "../storage/saveError.js";
import { FocusHeader } from "./FocusHeader.js";
import type { Today } from "./useWritingStats.js";
import { ReadOnlyNotice, SaveToast, TreeFailureToast } from "./SaveToast.js";
import { useEscape, useShortcut } from "./useShortcut.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { WritingSettingsPanel } from "./WritingSettingsPanel.js";
import { t } from "../i18n/i18n.js";

interface WritingAreaProps {
  /** Granska beside the text, or nothing. */
  aside: ReactNode;
  selectionBar: ReactNode;
  /** Above the text: the chapter and when, or a note's sort, name and connections. */
  header: ReactNode;
  /** Below the text: where a note is named. */
  footer: ReactNode;
  /** Saved by a newer Penna: shown, never written to. */
  isReadOnly: boolean;
  /** Hidden, not removed, while another view shows: the editor keeps its scene and undo. */
  isHidden: boolean;
  manuscriptSearch: ManuscriptScope;
  replaceToast: ReactNode;
  today: Today;
  editor: ReturnType<typeof useEditorView>;
  focusLocation: string;
  hasScene: boolean;
  saveStatus: SaveStatus | null;
  treeFailure: SaveFailure | null;
  settings: WritingSettings;
  isFocusMode: boolean;
  isSearchOpen: boolean;
  setSearchOpen: (isOpen: boolean) => void;
  searchSeed: string;
  onChangeSettings: (change: SettingsChange) => void;
  onToggleFocus: () => void;
  onRetrySave: () => void;
  onNewScene: () => void;
}

// Focus and typewriter only act in the focus mode; CSS dims the text around the cursor.
function manuscriptClass(settings: WritingSettings, isFocusMode: boolean) {
  if (!isFocusMode) return "manuscript";
  return `manuscript focus-${settings.focus}${settings.typewriter ? " typewriter" : ""}`;
}

// Ctrl and plus or minus change the text size; "=" is where plus sits on a US keyboard.
function useTextSizeKeys(change: (change: SettingsChange) => void) {
  const larger = () => change((current) => changeSize(current, 1));
  useShortcut("+", larger);
  useShortcut("+", larger, { shift: true });
  useShortcut("=", larger);
  useShortcut("-", () => change((current) => changeSize(current, -1)));
  useShortcut("0", () => change((current) => ({ ...current, size: DEFAULT_SETTINGS.size })));
}

function useWritingKeys(props: WritingAreaProps, panels: ReturnType<typeof usePanels>) {
  useTextSizeKeys(props.onChangeSettings);
  useShortcut("f", () => props.setSearchOpen(true));
  useShortcut("f", props.onToggleFocus, { shift: true });
  useShortcut("n", props.onNewScene, { alt: true });
  useEscape(() => {
    if (panels.isSettingsOpen) panels.setSettingsOpen(false);
    else if (props.isFocusMode) props.onToggleFocus();
  });
}

function usePanels() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  return { isSettingsOpen, setSettingsOpen };
}

function EmptyScene({ onNewScene }: { onNewScene: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{t("Ingen scen är öppen")}</p>
      <p className="empty-text">{t("Skapa en scen eller välj en i sidomenyn.")}</p>
      <button className="button primary" onClick={onNewScene}>
        {t("Ny scen")}
      </button>
    </div>
  );
}

// The editor element stays mounted in both modes, so undo history and cursor survive the switch.
// The page carries the text's width, so the header and footer line up with the text.
function Page(props: WritingAreaProps) {
  const { editor, settings, isFocusMode, hasScene } = props;
  return (
    <div className="page" style={proseStyle(settings) as CSSProperties}>
      {!hasScene && <EmptyScene onNewScene={props.onNewScene} />}
      {hasScene && !isFocusMode && props.header}
      <div
        className={manuscriptClass(settings, isFocusMode) + (hasScene ? "" : " hidden")}
        ref={editor.mount}
      />
      {hasScene && !isFocusMode && props.footer}
    </div>
  );
}

// What floats over the page: the settings and search panels, and the toasts.
function Floating(props: WritingAreaProps & { isSettingsOpen: boolean }) {
  return (
    <>
      {props.isSettingsOpen && (
        <WritingSettingsPanel
          settings={props.settings}
          onChange={props.onChangeSettings}
          showsFocusOptions={props.isFocusMode}
        />
      )}
      {props.isSearchOpen && (
        <SearchPanel
          key={props.searchSeed}
          {...props.editor}
          initialSearch={props.searchSeed}
          manuscript={props.manuscriptSearch}
          onClose={() => props.setSearchOpen(false)}
        />
      )}
      {props.selectionBar}
      <SaveToast status={props.saveStatus} onRetry={props.onRetrySave} />
      <TreeFailureToast failure={props.treeFailure} />
      <ReadOnlyNotice isReadOnly={props.isReadOnly} />
      {props.replaceToast}
    </>
  );
}

// The writing settings switch the editor's modes, which ProseMirror reads on every update.
function useEditorModes(props: WritingAreaProps) {
  const { editor, settings } = props;
  const modes = editor.modes.current;
  modes.isTypewriterOn = props.isFocusMode && settings.typewriter;
  modes.isTypographyOn = settings.typography;
  modes.isSpellcheckOn = settings.spellcheck;
  // The session makes the editor writable when a scene opens; a read-only project takes it back.
  if (props.isReadOnly) modes.isEditable = false;
  modes.repeatWindow = settings.review ? settings.repeatWindow : null;
  const { run } = editor;
  useEffect(() => run(refreshRepetitions, false), [settings.review, settings.repeatWindow, run]);
  // The spellcheck attribute is read when the view updates, so a change updates it at once.
  useEffect(
    () => editor.viewRef.current?.setProps({}),
    [settings.spellcheck, props.isReadOnly, props.hasScene, editor.viewRef],
  );
}

/** Skriv: the open scene or note, and in the focus mode its quiet header with Aa. */
export function WritingArea(props: WritingAreaProps) {
  const { editor } = props;
  const panels = usePanels();
  useWritingKeys(props, panels);
  useEditorModes(props);
  const { focusIfRequested } = editor;
  useEffect(() => focusIfRequested(), [props.hasScene, focusIfRequested]);
  const doc = editor.editorState?.doc;
  return (
    <main className={props.isHidden ? "writing hidden" : "writing"}>
      {props.isFocusMode && (
        <FocusHeader
          {...props}
          location={props.focusLocation}
          wordCount={doc ? countDocumentWords(doc) : 0}
          isSettingsOpen={panels.isSettingsOpen}
          onToggleSettings={() => panels.setSettingsOpen(!panels.isSettingsOpen)}
          onLeave={props.onToggleFocus}
        />
      )}
      <div className="writing-body">
        <Page {...props} />
        {props.aside}
      </div>
      <Floating {...props} isSettingsOpen={panels.isSettingsOpen} />
    </main>
  );
}
