import type { Node } from "prosemirror-model";
import { Plugin, PluginKey, type Command } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";

/** A name to look for in the text: the id of its card and the pattern for its names. */
export interface MentionMatcher {
  id: string;
  pattern: RegExp | null;
}

export interface Mention {
  id: string;
  from: number;
  to: number;
}

/** Every mention in a text, the longer name winning where two cards match the same words. */
export function findMentions(text: string, matchers: MentionMatcher[]): Mention[] {
  const found = matchers.flatMap(({ id, pattern }) =>
    pattern
      ? [...text.matchAll(pattern)].map((match) => ({
          id,
          from: match.index,
          to: match.index + match[0].length,
        }))
      : [],
  );
  found.sort((first, second) => first.from - second.from || second.to - first.to);
  const kept: Mention[] = [];
  for (const mention of found) {
    const last = kept[kept.length - 1];
    if (!last || mention.from >= last.to) kept.push(mention);
  }
  return kept;
}

// A leaf such as a line break counts as one character, so text offsets are document offsets.
const LEAF = "￼";

/** The mentions in a document as inline decorations; nothing is written into the text. */
export function mentionDecorations(doc: Node, matchers: MentionMatcher[]): DecorationSet {
  const decorations: Decoration[] = [];
  doc.descendants((node, position) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, undefined, LEAF);
    for (const mention of findMentions(text, matchers)) {
      const from = position + 1 + mention.from;
      const to = position + 1 + mention.to;
      decorations.push(
        Decoration.inline(from, to, { class: "mention", "data-entity": mention.id }),
      );
    }
    return false;
  });
  return DecorationSet.create(doc, decorations);
}

const mentionsKey = new PluginKey<DecorationSet>("mentions");

/** Run after the cards change, so a new character is linked in the text at once. */
export const refreshMentions: Command = (state, dispatch) => {
  dispatch?.(state.tr.setMeta(mentionsKey, true));
  return true;
};

/**
 * Underlines known names in the open scene. `matchers` is asked when the text or the cards
 * change; `onMention` gets the card's id and the name's place on screen when one is clicked.
 */
export function mentionsPlugin(
  matchers: () => MentionMatcher[],
  onMention: (id: string, box: DOMRect) => void,
) {
  return new Plugin<DecorationSet>({
    key: mentionsKey,
    state: {
      init: (_config, state) => mentionDecorations(state.doc, matchers()),
      apply: (transaction, old, _oldState, state) =>
        transaction.docChanged || transaction.getMeta(mentionsKey)
          ? mentionDecorations(state.doc, matchers())
          : old,
    },
    props: {
      decorations: (state) => mentionsKey.getState(state),
      handleClick: (_view, _position, event) => {
        const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(".mention");
        const id = element?.dataset["entity"];
        if (!element || !id) return false;
        onMention(id, element.getBoundingClientRect());
        return false;
      },
    },
  });
}
