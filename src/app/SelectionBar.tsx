import { TextSelection, type Command, type EditorState } from "prosemirror-state";
import { useEditorState } from "../editor/editorStore.js";
import { useEffect, useState } from "react";
import { isMarkActive, toggleBold, toggleItalic } from "../editor/commands.js";
import { insertFootnote } from "../editor/footnoteEditing.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { StylePicker } from "./StylePicker.js";
import { usePhone } from "./phone/usePhone.js";
import { countWordsBetween } from "../manuscript/wordCount.js";
import { t, formatNumber } from "../i18n/i18n.js";

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

function SelectedWords({ editorState }: { editorState: EditorState | null }) {
  if (!editorState) return null;
  const { from, to } = editorState.selection;
  const words = countWordsBetween(editorState.doc, from, to);
  return (
    <span className="selection-words">
      {words === 1 ? t("1 ord") : t("{count} ord", { count: formatNumber(words) })}
    </span>
  );
}

// Focus moving in or out of the text makes no transaction, so it is followed here.
function useIsBarWanted(editor: Editor) {
  const [hasFocus, setFocus] = useState(false);
  const element = editor.viewRef.current?.dom;
  useEffect(() => {
    if (!element) return;
    const onFocus = () => setFocus(true);
    // The style menu takes the focus while it is open; the bar it belongs to stays.
    const onBlur = (event: FocusEvent) =>
      setFocus(event.relatedTarget instanceof Element && !!event.relatedTarget.closest(".menu"));
    element.addEventListener("focus", onFocus);
    element.addEventListener("blur", onBlur);
    return () => {
      element.removeEventListener("focus", onFocus);
      element.removeEventListener("blur", onBlur);
    };
  }, [element]);
  return hasFocus;
}

// On a phone the bar waits just above the tools over the keyboard, out of the way of the fingers
// that drag the selection's ends.
const phoneBarTop = () =>
  (document.querySelector(".phone-toolbar")?.getBoundingClientRect().top ??
    window.visualViewport?.height ??
    window.innerHeight) -
  BAR_HEIGHT -
  8;

function barPosition(editor: Editor, isPhone: boolean) {
  const view = editor.viewRef.current;
  const selection = view?.state.selection;
  if (!view || !(selection instanceof TextSelection) || selection.empty) return null;
  if (isPhone) return { top: phoneBarTop() };
  const start = view.coordsAtPos(selection.from);
  if (start.top > BAR_HEIGHT * 2) return { left: start.left, top: start.top - BAR_HEIGHT - 6 };
  return { left: start.left, top: view.coordsAtPos(selection.to).bottom + 6 };
}

interface BarProps {
  editor: Editor;
  onComment: () => void;
  /** Left out where the computer has no voice. */
  onReadAloud?: (() => void) | undefined;
}

// The phone's own menu over a selection is turned off (MainActivity.kt), so copying is here; the
// footnote is in the tools over the keyboard.
function PhoneClipboard() {
  return (
    <>
      <button className="icon-button" onClick={() => document.execCommand("copy")}>
        {t("Kopiera")}
      </button>
      <button className="icon-button" onClick={() => document.execCommand("cut")}>
        {t("Klipp ut")}
      </button>
    </>
  );
}

function BarActions({ editor, onComment, onReadAloud, isPhone }: BarProps & { isPhone: boolean }) {
  return (
    <>
      {isPhone && <PhoneClipboard />}
      <button className="icon-button" onClick={onComment}>
        {t("Kommentera")}
      </button>
      {!isPhone && (
        <button className="icon-button" onClick={() => editor.run(insertFootnote)}>
          {t("Fotnot")}
        </button>
      )}
      {onReadAloud && (
        <button className="icon-button" onClick={onReadAloud}>
          {t("Läs upp")}
        </button>
      )}
    </>
  );
}

/** Marks, a comment or a footnote for the selected words, and the words as a picture to share. */
export function SelectionBar(props: BarProps) {
  const { editor } = props;
  const editorState = useEditorState(editor);
  const isWanted = useIsBarWanted(editor);
  const isPhone = usePhone();
  const position = isWanted ? barPosition(editor, isPhone) : null;
  if (!position) return null;
  const marks = { editorState, run: editor.run };
  return (
    <div
      className={isPhone ? "selection-bar phone" : "selection-bar"}
      role="toolbar"
      aria-label={t("Markering")}
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      <MarkButton {...marks} mark="bold" label={t("Fetstil")} />
      <MarkButton {...marks} mark="italic" label={t("Kursiv")} />
      {!isPhone && <StylePicker editorState={editorState} run={editor.run} />}
      <BarActions {...props} isPhone={isPhone} />
      {!isPhone && <SelectedWords editorState={editorState} />}
    </div>
  );
}
