import { selectAll } from "prosemirror-commands";
import type { EditorView } from "prosemirror-view";
import { useState, type MouseEvent } from "react";
import {
  isMisspelled,
  refreshSpelling,
  wordAt,
  type SpellingSwitch,
} from "../../editor/spellingMarks.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { Menu, type MenuItem } from "../Menu.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

type Place = { word: string; from: number; to: number };

function selectedText(view: EditorView) {
  const { from, to } = view.state.selection;
  return view.state.doc.textBetween(from, to, "\n");
}

// The clipboard is written by the page itself; reading it needs the app.
function clipboardItems(view: EditorView): MenuItem[] {
  const copy = () => void navigator.clipboard.writeText(selectedText(view));
  const cut = () => (copy(), view.dispatch(view.state.tr.deleteSelection()));
  const { readClipboard } = platform;
  const paste = readClipboard && (() => void readClipboard().then((text) => view.pasteText(text)));
  return [
    ...(view.state.selection.empty
      ? []
      : [
          { label: t("Klipp ut"), shortcut: "Ctrl+X", onSelect: cut },
          { label: t("Kopiera"), shortcut: "Ctrl+C", onSelect: copy },
        ]),
    ...(paste ? [{ label: t("Klistra in"), shortcut: "Ctrl+V", onSelect: paste }] : []),
  ];
}

function editItems(view: EditorView): MenuItem[] {
  const all = () => selectAll(view.state, view.dispatch);
  const items = [
    ...clipboardItems(view),
    { label: t("Markera allt"), shortcut: "Ctrl+A", onSelect: all },
  ];
  return items.map((item) => ({ ...item, onSelect: () => (item.onSelect?.(), view.focus()) }));
}

function spellingItems(
  view: EditorView,
  spelling: SpellingSwitch,
  place: Place,
  suggestions: string[],
) {
  const replace = (word: string) =>
    view.dispatch(view.state.tr.insertText(word, place.from, place.to));
  const corrections = suggestions.length
    ? suggestions.map((word) => ({ label: word, onSelect: () => (replace(word), view.focus()) }))
    : [{ label: t("Inga förslag"), onSelect: () => view.focus() }];
  const add = () => {
    spelling.addWord(place.word);
    refreshSpelling(view.state, view.dispatch);
  };
  return [
    ...corrections,
    {
      label: t("Lägg till ”{word}” i bokens ordlista", { word: place.word }),
      separatorBefore: true,
      onSelect: add,
    },
  ];
}

async function itemsAt(view: EditorView, spelling: SpellingSwitch | null, position: number) {
  const place = wordAt(view.state.doc, position);
  if (!spelling || !place || !isMisspelled(spelling, place.word)) return editItems(view);
  const suggestions = await spelling.suggestions(spelling.language, place.word).catch(() => []);
  const [first, ...rest] = editItems(view);
  return [
    ...spellingItems(view, spelling, place, suggestions),
    ...(first ? [{ ...first, separatorBefore: true }, ...rest] : []),
  ];
}

/** The text's own right-click menu: corrections for a misspelled word, then cut, copy and paste. */
export function useTextMenu(editor: ReturnType<typeof useEditorView>) {
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const open = async (event: MouseEvent) => {
    const view = editor.viewRef.current;
    if (!view || platform.isPhone) return;
    event.preventDefault();
    const { clientX: x, clientY: y } = event;
    const position = view.posAtCoords({ left: x, top: y })?.pos ?? view.state.selection.from;
    setMenu({ x, y, items: await itemsAt(view, editor.modes.current.spelling, position) });
  };
  const layer = menu && <Menu {...menu} label={t("Text")} onClose={() => setMenu(null)} />;
  return { onContextMenu: (event: MouseEvent) => void open(event), layer };
}
