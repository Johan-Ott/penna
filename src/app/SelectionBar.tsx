import {
  AllSelection,
  TextSelection,
  type Command,
  type EditorState,
  type Selection,
} from "prosemirror-state";
import { useEditorState } from "../editor/editorStore.js";
import { useEffect, useState } from "react";
import type { useEditorView } from "../editor/useEditorView.js";
import { PinIcon, UnpinIcon } from "./AlignButtons.js";
import {
  BlockChoices,
  CommentButton,
  HistoryButtons,
  InsertMenu,
  MarkButtons,
  TextActions,
  type FormatActions,
} from "./FormatButtons.js";
import { misspelledAtCaret } from "./spelling/Corrections.js";
import { StylePicker } from "./StylePicker.js";
import { usePhone } from "./phone/usePhone.js";
import { countWordsBetween } from "../manuscript/wordCount.js";
import { t, formatNumber } from "../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

const BAR_HEIGHT = 40;

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

// Under the top bar at the least: a selection that starts above the screen, as Ctrl+A's does,
// keeps its bar where it can be seen.
const TOP_ROOM = 56;

// The words chosen, whether dragged over or all of them with Ctrl+A.
const isChosenText = (selection: Selection | undefined): selection is Selection =>
  (selection instanceof TextSelection || selection instanceof AllSelection) && !selection.empty;

function barPosition(editor: Editor, isPhone: boolean) {
  const view = editor.viewRef.current;
  const selection = view?.state.selection;
  if (!view || !isChosenText(selection)) return null;
  if (isPhone) return { top: phoneBarTop() };
  const start = view.coordsAtPos(selection.from);
  const left = Math.max(start.left, view.dom.getBoundingClientRect().left);
  if (start.top > BAR_HEIGHT * 2) return { left, top: start.top - BAR_HEIGHT - 6 };
  if (start.top < TOP_ROOM) return { left, top: TOP_ROOM };
  return { left, top: view.coordsAtPos(selection.to).bottom + 6 };
}

// A misspelled word clicked or double-clicked has its corrections under it; the floating row
// stays away so the two never stack.
const wantedPosition = (editor: Editor, isWanted: boolean, isPhone: boolean) =>
  isWanted && misspelledAtCaret(editor, editor.viewRef.current?.state ?? null) === null
    ? barPosition(editor, isPhone)
    : null;

interface BarProps extends FormatActions {
  editor: Editor;
  /** Shown over the text all the time, as a word processor's row, rather than over a selection. */
  isFixed?: boolean;
  /** Switches between that and floating over a selection; left out where there is no choice. */
  onToggleFixed?: () => void;
}

// The phone's own menu over a selection is turned off (MainActivity.kt), so copying is here; the
// footnote is in the tools over the keyboard.
const PhoneRow = ({ onComment, editorState, run }: RowProps) => (
  <>
    <MarkButtons editorState={editorState} run={run} />
    <button className="icon-button" onClick={() => document.execCommand("copy")}>
      {t("Kopiera")}
    </button>
    <button className="icon-button" onClick={() => document.execCommand("cut")}>
      {t("Klipp ut")}
    </button>
    <button className="icon-button" onClick={onComment}>
      {t("Kommentera")}
    </button>
  </>
);

// The row's last button: fixed over the text or floating over a selection, whichever it is not.
const PinButton = (props: { isFixed: boolean; onToggle: () => void }) => {
  const label = props.isFixed ? t("Visa raden bara vid markering") : t("Fäst raden överst");
  return (
    <button
      className="icon-button bar-pin"
      aria-label={label}
      title={label}
      onClick={props.onToggle}
    >
      {props.isFixed ? <UnpinIcon /> : <PinIcon />}
    </button>
  );
};

const Pin = (props: BarProps & { isFixed: boolean }) =>
  props.onToggleFixed ? <PinButton isFixed={props.isFixed} onToggle={props.onToggleFixed} /> : null;

type RowProps = BarProps & { editorState: EditorState | null; run: (command: Command) => void };

// Over a selection only what is done to those words: the marks, the style and a comment.
const FloatingRow = (props: RowProps) => (
  <>
    <MarkButtons {...props} />
    <StylePicker {...props} />
    <CommentButton onComment={props.onComment} />
    <Pin {...props} isFixed={false} />
  </>
);

// Fixed over the text, everything, as a word processor's row.
const FixedRow = (props: RowProps) => (
  <>
    <HistoryButtons run={props.run} />
    <BlockChoices {...props} />
    <MarkButtons {...props} />
    <InsertMenu {...props} />
    <TextActions {...props} />
    <SelectedWords editorState={props.editorState} />
    <Pin {...props} isFixed />
  </>
);

function RowContent(props: RowProps & { isPhone: boolean; isFixed: boolean }) {
  if (props.isPhone) return <PhoneRow {...props} />;
  return props.isFixed ? <FixedRow {...props} /> : <FloatingRow {...props} />;
}

/** The format row: floating over a selection, or fixed over the text when the writer wants it. */
export function SelectionBar(props: BarProps) {
  const { editor } = props;
  const editorState = useEditorState(editor);
  const isWanted = useIsBarWanted(editor);
  const isPhone = usePhone();
  const isFixed = props.isFixed === true && !isPhone;
  const position = isFixed ? {} : wantedPosition(editor, isWanted, isPhone);
  if (!position) return null;
  const classes = ["selection-bar", isPhone && "phone", isFixed && "fixed"];
  return (
    <div
      className={classes.filter(Boolean).join(" ")}
      role="toolbar"
      aria-label={isFixed ? t("Formatering") : t("Markering")}
      style={position}
      onMouseDown={(event) => event.preventDefault()}
    >
      <RowContent {...props} {...{ editorState, isPhone, isFixed }} run={editor.run} />
    </div>
  );
}
