import { useEffect, useState } from "react";
import { isMisspelled, refreshSpelling, wordAt } from "../../editor/spellingMarks.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { t } from "../../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

function misspelledAtCaret(editor: Editor) {
  const state = editor.editorState;
  const spelling = editor.modes.current.spelling;
  if (!state || !spelling || !state.selection.empty) return null;
  const place = wordAt(state.doc, state.selection.from);
  return place && isMisspelled(spelling, place.word) ? place : null;
}

/** The misspelled word the cursor stands in, with its corrections once they are found. */
export function useCaretCorrections(editor: Editor) {
  const wrong = misspelledAtCaret(editor);
  const [found, setFound] = useState<{ word: string; suggestions: string[] } | null>(null);
  const word = wrong?.word ?? null;
  // The switch is a new object on each render, so only the word and the language are watched.
  const language = editor.modes.current.spelling?.language ?? null;
  useEffect(() => {
    const spelling = editor.modes.current.spelling;
    if (!word || !language || !spelling) return;
    let isLive = true;
    void spelling
      .suggestions(language, word)
      .then((suggestions) => isLive && setFound({ word, suggestions }))
      .catch(() => undefined);
    return () => void (isLive = false);
  }, [word, language, editor.modes]);
  return wrong && found?.word === wrong.word ? { ...wrong, suggestions: found.suggestions } : null;
}

type Corrections = NonNullable<ReturnType<typeof useCaretCorrections>>;

/** On a phone, over the keyboard: tap a correction, or keep the word in the book's own list. */
export function CorrectionsBar({
  editor,
  corrections,
}: {
  editor: Editor;
  corrections: Corrections;
}) {
  const replace = (word: string) => {
    const view = editor.viewRef.current;
    view?.dispatch(view.state.tr.insertText(word, corrections.from, corrections.to));
  };
  const add = () => {
    const view = editor.viewRef.current;
    editor.modes.current.spelling?.addWord(corrections.word);
    if (view) refreshSpelling(view.state, view.dispatch);
  };
  return (
    <div className="phone-corrections" aria-label={t("Rättningar")}>
      {corrections.suggestions.slice(0, 4).map((word) => (
        <button key={word} className="phone-correction" onClick={() => replace(word)}>
          {word}
        </button>
      ))}
      <button className="phone-correction quiet" onClick={add}>
        {t("Lägg till")}
      </button>
    </div>
  );
}
