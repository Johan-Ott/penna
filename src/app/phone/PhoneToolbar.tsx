import { redo, undo } from "prosemirror-history";
import { useState } from "react";
import { insertSceneBreak } from "../../editor/commands.js";
import { insertFootnote } from "../../editor/footnoteEditing.js";
import type { AppState } from "../App.js";
import { insertChosenPicture } from "../palette/sceneContext.js";
import { StylePicker } from "../StylePicker.js";
import { CorrectionsBar, useCaretCorrections } from "../spelling/Corrections.js";
import type { Project } from "../useProject.js";
import { WritingSettingsPanel } from "../WritingSettingsPanel.js";
import { t } from "../../i18n/i18n.js";

// What a keyboard shortcut does on the computer, as buttons over the phone's keyboard.
// Pressing one keeps the text focused, so the keyboard stays up.

type Tool = [label: string, symbol: string, onPress: () => void];

function tools(app: AppState, project: Project, toggleSettings: () => void): Tool[] {
  const { run } = app.editor;
  return [
    [t("Ångra"), "↶", () => run(undo)],
    [t("Gör om"), "↷", () => run(redo)],
    [t("Scenbrytning"), "⁂", () => run(insertSceneBreak)],
    [t("Infoga fotnot"), "¹", () => run(insertFootnote)],
    [t("Infoga bild…"), "▣", () => void insertChosenPicture(project.dir, run)],
    [t("Skrivinställningar"), "Aa", toggleSettings],
  ];
}

function Tools(props: { app: AppState; project: Project; onSettings: () => void }) {
  const { editor } = props.app;
  return (
    <>
      <StylePicker editorState={editor.editorState} run={editor.run} />
      {tools(props.app, props.project, props.onSettings).map(([label, symbol, onPress]) => (
        <button key={label} className="phone-tool" aria-label={label} onClick={onPress}>
          {symbol}
        </button>
      ))}
    </>
  );
}

// Aa: the writing settings, with the focus mode as a switch since the phone has no Esc or topbar.
function PhoneSettings({ writingMode }: Pick<AppState, "writingMode">) {
  return (
    <WritingSettingsPanel
      settings={writingMode.settings}
      onChange={writingMode.onChangeSettings}
      showsFocusOptions={writingMode.isFocusMode}
      focusMode={{ isOn: writingMode.isFocusMode, onFlip: writingMode.onToggleFocus }}
    />
  );
}

export function PhoneToolbar({ app, project }: { app: AppState; project: Project }) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const { editor, writingMode } = app;
  const corrections = useCaretCorrections(editor);
  if (!app.scene) return null;
  const toggleSettings = () => setSettingsOpen(!isSettingsOpen);
  return (
    <>
      {isSettingsOpen && <PhoneSettings writingMode={writingMode} />}
      <div
        className="phone-toolbar"
        role="toolbar"
        aria-label={t("Verktyg")}
        onMouseDown={(event) => event.preventDefault()}
      >
        {corrections ? (
          <CorrectionsBar editor={editor} corrections={corrections} />
        ) : (
          <Tools app={app} project={project} onSettings={toggleSettings} />
        )}
      </div>
    </>
  );
}
