import { useEffect, useState } from "react";
import { usePhone } from "../phone/usePhone.js";
import { CorrectionsBar, useCaretCorrections } from "./Corrections.js";
import { t } from "../../i18n/i18n.js";

type Editor = Parameters<typeof CorrectionsBar>[0]["editor"];

// Only a click into the word asks for its corrections; typing it out does not.
function useClicked(editor: Editor) {
  const [isClicked, setClicked] = useState(false);
  const element = editor.viewRef.current?.dom;
  useEffect(() => {
    if (!element) return;
    const onPointer = () => setClicked(true);
    const onKey = () => setClicked(false);
    element.addEventListener("pointerup", onPointer);
    element.addEventListener("keydown", onKey);
    return () => {
      element.removeEventListener("pointerup", onPointer);
      element.removeEventListener("keydown", onKey);
    };
  }, [element]);
  return isClicked;
}

// The word the cursor stands in, when Granska has marked it as said again close by.
export function repeatedAtCaret(editor: Editor) {
  const view = editor.viewRef.current;
  const state = view?.state;
  if (!view || !state) return null;
  const { node } = view.domAtPos(state.selection.from);
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest(".repeat")?.textContent ?? null;
}

export function RepeatNote({ word, onReview }: { word: string; onReview: () => void }) {
  return (
    <>
      <span className="click-note">{t("”{word}” står flera gånger nära varandra", { word })}</span>
      <button className="phone-correction quiet" onClick={onReview}>
        {t("Granska")}
      </button>
    </>
  );
}

function caretPlace(editor: Editor) {
  const view = editor.viewRef.current;
  const from = view?.state.selection.from;
  return view && from !== undefined ? view.coordsAtPos(from) : null;
}

// What a click on the word offers: corrections for a misspelling, or a word said again close by.
function useClickHelp(editor: Editor) {
  const isPhone = usePhone();
  const isClicked = useClicked(editor);
  const corrections = useCaretCorrections(editor);
  const repeated = corrections ? null : repeatedAtCaret(editor);
  const isWanted = !isPhone && isClicked && (corrections !== null || repeated !== null);
  const place = isWanted ? caretPlace(editor) : null;
  return place && { corrections, repeated, place };
}

/** On the computer: a click on an underlined word shows what can be done about it, under it. */
export function ClickCorrections({ editor, onReview }: { editor: Editor; onReview: () => void }) {
  const help = useClickHelp(editor);
  if (!help) return null;
  return (
    <div
      className="click-corrections"
      style={{ left: help.place.left, top: help.place.bottom + 6 }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {help.corrections && <CorrectionsBar editor={editor} corrections={help.corrections} />}
      {help.repeated && <RepeatNote word={help.repeated} onReview={onReview} />}
    </div>
  );
}
