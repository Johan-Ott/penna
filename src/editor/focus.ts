import type { Node } from "prosemirror-model";
import { Plugin, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet, type EditorView } from "prosemirror-view";

const sentences = new Intl.Segmenter("sv", { granularity: "sentence" });

export function sentenceRange(text: string, offset: number): { from: number; to: number } {
  let last = { from: 0, to: text.length };
  for (const { segment, index } of sentences.segment(text)) {
    last = { from: index, to: index + segment.length };
    if (offset < last.to) return last;
  }
  return last;
}

/** The sentence the cursor stands in, up to the cursor; the paragraph before when it is empty. */
export function sentenceBefore(doc: Node, position: number): string {
  const $at = TextSelection.near(doc.resolve(Math.min(position, doc.content.size)), -1).$head;
  const text = $at.parent.textBetween(0, $at.parentOffset, undefined, " ");
  const found = text.slice(sentenceRange(text, Math.max(0, text.length - 1)).from).trim();
  if (found || $at.depth === 0 || $at.before() === 0) return found;
  return sentenceBefore(doc, $at.before() - 1);
}

// Slightly above the middle of the screen.
const TYPEWRITER_HEIGHT = 0.45;

export function typewriterScrollDelta(view: {
  caretTop: number;
  viewTop: number;
  viewHeight: number;
}) {
  return view.caretTop - (view.viewTop + view.viewHeight * TYPEWRITER_HEIGHT);
}

/** CSS decides whether the rest is dimmed, so the focus mode switches without touching the document. */
export function focusPlugin() {
  return new Plugin({
    props: {
      decorations(state) {
        const { $head } = state.selection;
        if (!$head.parent.isTextblock) return null;
        const blockStart = $head.start();
        const sentence = sentenceRange($head.parent.textContent, $head.parentOffset);
        return DecorationSet.create(state.doc, [
          Decoration.node($head.before(), $head.after(), { class: "focused-block" }),
          Decoration.inline(blockStart + sentence.from, blockStart + sentence.to, {
            class: "focused-sentence",
          }),
        ]);
      },
    },
  });
}

export function typewriterPlugin(isOn: () => boolean) {
  const keepLineStill = (view: EditorView) => {
    const scroller = view.dom.closest<HTMLElement>(".page");
    if (!isOn() || !scroller || !view.hasFocus()) return;
    const box = scroller.getBoundingClientRect();
    const caretTop = view.coordsAtPos(view.state.selection.head).top;
    scroller.scrollTop += typewriterScrollDelta({
      caretTop,
      viewTop: box.top,
      viewHeight: box.height,
    });
  };
  return new Plugin({ view: () => ({ update: keepLineStill }) });
}
