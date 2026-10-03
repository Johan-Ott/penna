import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { ManuscriptScope } from "../editor/manuscriptSearch.js";
import { SearchPanel } from "../editor/SearchPanel.js";
import type { useEditorView } from "../editor/useEditorView.js";
import {
  changeSize,
  DEFAULT_SETTINGS,
  proseStyle,
  type WritingSettings,
} from "../editor/writingSettings.js";
import { countDocumentWords } from "../manuscript/wordCount.js";
import type { SceneChapter } from "../project/treeLabels.js";
import type { SaveStatus } from "../storage/autosave.js";
import type { SaveFailure } from "../storage/saveError.js";
import { FocusHeader } from "./FocusHeader.js";
import type { Today } from "./useWritingStats.js";
import { SaveToast, TreeFailureToast } from "./SaveToast.js";
import { Toolbar } from "./Toolbar.js";
import { useEscape, useShortcut } from "./useShortcut.js";
import type { SettingsChange } from "./useWritingSettings.js";
import { WritingSettingsPanel } from "./WritingSettingsPanel.js";

interface WritingAreaProps {
  /** Hidden, not removed, while another view shows: the editor keeps its scene and undo. */
  isHidden: boolean;
  manuscriptSearch: ManuscriptScope;
  replaceToast: ReactNode;
  today: Today;
  editor: ReturnType<typeof useEditorView>;
  breadcrumb: string[];
  focusLocation: string;
  chapterHeading: SceneChapter | null;
  hasScene: boolean;
  saveStatus: SaveStatus | null;
  treeFailure: SaveFailure | null;
  settings: WritingSettings;
  isFocusMode: boolean;
  isSearchOpen: boolean;
  setSearchOpen: (isOpen: boolean) => void;
  onChangeSettings: (change: SettingsChange) => void;
  onToggleFocus: () => void;
  onRetrySave: () => void;
  onNewScene: () => void;
}

// The chapter's number and title open its first scene, as in a printed book.
function ChapterHeading({ chapter }: { chapter: SceneChapter | null }) {
  if (!chapter) return null;
  return (
    <header className="chapter-heading">
      <div className="chapter-label">Kapitel {chapter.number}</div>
      <h1>{chapter.title}</h1>
    </header>
  );
}

function WritingHeader(
  props: WritingAreaProps & { isSettingsOpen: boolean; onToggleSettings: () => void },
) {
  const doc = props.editor.editorState?.doc;
  const wordCount = doc ? countDocumentWords(doc) : 0;
  if (props.isFocusMode) {
    return (
      <FocusHeader
        {...props}
        location={props.focusLocation}
        wordCount={wordCount}
        onLeave={props.onToggleFocus}
      />
    );
  }
  return (
    <Toolbar
      {...props}
      editorState={props.editor.editorState}
      run={props.editor.run}
      wordCount={wordCount}
      onEnterFocus={props.onToggleFocus}
    />
  );
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

// The editor element stays mounted in both modes, so undo history and cursor survive the switch.
function EmptyScene({ onNewScene }: { onNewScene: () => void }) {
  return (
    <div className="empty-state">
      <p className="empty-title">Ingen scen är öppen</p>
      <p className="empty-text">Skapa en scen eller välj en i strukturen till vänster.</p>
      <button className="button primary" onClick={onNewScene}>
        Ny scen
      </button>
    </div>
  );
}

function Page({
  editor,
  settings,
  isFocusMode,
  chapterHeading,
  hasScene,
  onNewScene,
}: WritingAreaProps) {
  const hidden = hasScene ? "" : " hidden";
  return (
    <div className="page">
      {!hasScene && <EmptyScene onNewScene={onNewScene} />}
      <ChapterHeading chapter={chapterHeading} />
      <div
        className={manuscriptClass(settings, isFocusMode) + hidden}
        style={proseStyle(settings) as CSSProperties}
        ref={editor.mount}
      />
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
          {...props.editor}
          manuscript={props.manuscriptSearch}
          onClose={() => props.setSearchOpen(false)}
        />
      )}
      <SaveToast status={props.saveStatus} onRetry={props.onRetrySave} />
      <TreeFailureToast failure={props.treeFailure} />
      {props.replaceToast}
    </>
  );
}

export function WritingArea(props: WritingAreaProps) {
  const { editor, settings } = props;
  const panels = usePanels();
  useWritingKeys(props, panels);
  editor.typewriterRef.current = props.isFocusMode && settings.typewriter;
  editor.typographyRef.current = settings.typography;
  editor.spellcheckRef.current = settings.spellcheck;
  // The spellcheck attribute is read when the view updates, so a change updates it at once.
  useEffect(() => editor.viewRef.current?.setProps({}), [settings.spellcheck, editor.viewRef]);
  const { focusIfRequested } = editor;
  useEffect(() => focusIfRequested(), [props.hasScene, focusIfRequested]);
  return (
    <main className={props.isHidden ? "writing hidden" : "writing"}>
      <WritingHeader
        {...props}
        isSettingsOpen={panels.isSettingsOpen}
        onToggleSettings={() => panels.setSettingsOpen(!panels.isSettingsOpen)}
      />
      <Page {...props} />
      <Floating {...props} isSettingsOpen={panels.isSettingsOpen} />
    </main>
  );
}
