import { NodeSelection, TextSelection } from "prosemirror-state";
import { selectedFootnote } from "../editor/footnoteEditing.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { t } from "../i18n/i18n.js";

type Editor = ReturnType<typeof useEditorView>;

// The footnote is replaced on every change, so the selection is put back on it each time.
function writeText(editor: Editor, position: number, text: string) {
  const view = editor.viewRef.current;
  const node = view?.state.doc.nodeAt(position);
  if (!view || !node) return;
  const transaction = view.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, text });
  view.dispatch(transaction.setSelection(NodeSelection.create(transaction.doc, position)));
}

function leave(editor: Editor, position: number, shouldRemove: boolean) {
  const view = editor.viewRef.current;
  if (!view) return;
  const transaction = shouldRemove ? view.state.tr.delete(position, position + 1) : view.state.tr;
  const cursor = shouldRemove ? position : position + 1;
  view.dispatch(transaction.setSelection(TextSelection.create(transaction.doc, cursor)));
  view.focus();
}

function FootnoteText(props: { editor: Editor; position: number; text: string }) {
  const { editor, position } = props;
  return (
    <textarea
      autoFocus
      aria-label={t("Fotnotens text")}
      placeholder={t("Fotnotens text")}
      value={props.text}
      onChange={(event) => writeText(editor, position, event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape" || (event.key === "Enter" && !event.shiftKey)) {
          event.preventDefault();
          leave(editor, position, false);
        }
      }}
    />
  );
}

export function FootnotePopover({ editor }: { editor: Editor }) {
  const view = editor.viewRef.current;
  const selection = editor.editorState?.selection;
  const footnote = selection ? selectedFootnote(selection) : null;
  if (!view || !footnote) return null;
  const { position, node } = footnote;
  const top = view.coordsAtPos(position).bottom + 8;
  return (
    <div className="footnote-popover" style={{ top }} role="dialog" aria-label={t("Fotnot")}>
      <FootnoteText editor={editor} position={position} text={String(node.attrs["text"])} />
      <div className="footnote-actions">
        <button className="link-button" onClick={() => leave(editor, position, true)}>
          {t("Ta bort")}
        </button>
        <button className="button primary small" onClick={() => leave(editor, position, false)}>
          {t("Klar")}
        </button>
      </div>
    </div>
  );
}
