import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { useEffect, useState } from "react";
import { isMarkActive, toggleBold, toggleItalic } from "../editor/commands.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { StylePicker } from "./StylePicker.js";

type Editor = ReturnType<typeof useEditorView>;

const BAR_HEIGHT = 40;

function MarkButton(props: {
  editorState: EditorState | null;
  run: (command: Command) => void;
  mark: "bold" | "italic";
  label: string;
}) {
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

// Focus moving in or out of the text makes no transaction, so it is followed here.
function useEditorFocus(editor: Editor) {
  const [hasFocus, setFocus] = useState(false);
  const element = editor.viewRef.current?.dom;
  useEffect(() => {
    if (!element) return;
    const onFocus = () => setFocus(true);
    const onBlur = () => setFocus(false);
    element.addEventListener("focus", onFocus);
    element.addEventListener("blur", onBlur);
    return () => {
      element.removeEventListener("focus", onFocus);
      element.removeEventListener("blur", onBlur);
    };
  }, [element]);
  return hasFocus;
}

// Above the selection's start, or below its end when there is no room above.
function barPosition(editor: Editor) {
  const view = editor.viewRef.current;
  const selection = editor.editorState?.selection;
  if (!view || !(selection instanceof TextSelection) || selection.empty) return null;
  const start = view.coordsAtPos(selection.from);
  if (start.top > BAR_HEIGHT * 2) return { left: start.left, top: start.top - BAR_HEIGHT - 6 };
  return { left: start.left, top: view.coordsAtPos(selection.to).bottom + 6 };
}

/**
 * Bold, italic, style and comment beside the selected text. Right-click keeps the system's menu,
 * whose spelling suggestions the page cannot read.
 */
export function SelectionBar({ editor, onComment }: { editor: Editor; onComment: () => void }) {
  const hasFocus = useEditorFocus(editor);
  const position = hasFocus ? barPosition(editor) : null;
  if (!position) return null;
  return (
    <div
      className="selection-bar"
      role="toolbar"
      aria-label="Markering"
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      <MarkButton editorState={editor.editorState} run={editor.run} mark="bold" label="Fetstil" />
      <MarkButton editorState={editor.editorState} run={editor.run} mark="italic" label="Kursiv" />
      <StylePicker editorState={editor.editorState} run={editor.run} />
      <button className="icon-button" onClick={onComment}>
        Kommentera
      </button>
    </div>
  );
}
