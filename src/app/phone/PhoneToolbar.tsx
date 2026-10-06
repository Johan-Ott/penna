import { redo, undo } from "prosemirror-history";
import { useState } from "react";
import { insertSceneBreak } from "../../editor/commands.js";
import { insertFootnote } from "../../editor/footnoteEditing.js";
import type { AppState } from "../App.js";
import { insertChosenPicture } from "../palette/sceneContext.js";
import { StylePicker } from "../StylePicker.js";
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

export function PhoneToolbar({ app, project }: { app: AppState; project: Project }) {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const { editor, writingMode } = app;
  if (!app.scene) return null;
  const toggleSettings = () => setSettingsOpen(!isSettingsOpen);
  return (
    <>
      {isSettingsOpen && (
        <WritingSettingsPanel
          settings={writingMode.settings}
          onChange={writingMode.onChangeSettings}
          showsFocusOptions={false}
        />
      )}
      <div
        className="phone-toolbar"
        role="toolbar"
        aria-label={t("Verktyg")}
        onMouseDown={(event) => event.preventDefault()}
      >
        <StylePicker editorState={editor.editorState} run={editor.run} />
        {tools(app, project, toggleSettings).map(([label, symbol, onPress]) => (
          <button key={label} className="phone-tool" aria-label={label} onClick={onPress}>
            {symbol}
          </button>
        ))}
      </div>
    </>
  );
}
