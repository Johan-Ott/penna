import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { InputRule, inputRules, undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { Fragment, type Node } from "prosemirror-model";
import { search } from "prosemirror-search";
import { EditorState, TextSelection } from "prosemirror-state";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { insertLineBreak, insertSceneBreak, toggleBold, toggleItalic } from "./commands.js";
import { focusPlugin, typewriterPlugin } from "./focus.js";
import { mentionsPlugin, type MentionMatcher } from "./mentions.js";
import { placeholder } from "./placeholder.js";
import { repetitionsPlugin } from "./repetitionMarks.js";
import { commentsPlugin, type CommentAnchor } from "./commentMarks.js";
import { t } from "../i18n/i18n.js";

// Swedish typography as the writer types: Swedish uses ” for both opening and closing quotes.
// Each rule asks whether it is on, so the setting can change without a new editor state.
export function typographyRules(isOn: () => boolean): InputRule[] {
  const rule = (pattern: RegExp, text: string) =>
    new InputRule(pattern, (state, _match, start, end) =>
      isOn() ? state.tr.insertText(text, start, end) : null,
    );
  return [rule(/--$/, "–"), rule(/\.\.\.$/, "…"), rule(/"$/, "”"), rule(/'$/, "’")];
}

// *** alone on a line becomes a scene break, with an empty paragraph after it to write on.
const sceneBreakRule = new InputRule(/^\*\*\*$/, (state, _match, start, end) => {
  const $start = state.doc.resolve(start);
  if (end !== $start.end() || $start.parent.type !== schema.nodes.paragraph) return null;
  const before = $start.before();
  const replacement = [schema.nodes.sceneBreak.create(), schema.nodes.paragraph.create()];
  const transaction = state.tr.replaceWith(before, $start.after(), replacement);
  return transaction.setSelection(TextSelection.create(transaction.doc, before + 2));
});

/** What the app can switch while the writer types; ProseMirror asks on every update. */
export interface EditorSwitches {
  isTypewriterOn: () => boolean;
  isTypographyOn: () => boolean;
  /** The names of the project's cards, underlined where the text mentions them. */
  mentionMatchers: () => MentionMatcher[];
  onMention: (id: string, box: DOMRect) => void;
  /** Sentences a word may not be repeated within; null when the review is off. */
  repeatWindow: () => number | null;
  /** The open scene's comments, marked where their quotes are. */
  commentAnchors: () => CommentAnchor[];
  onComment: (id: string) => void;
}

export const DEFAULT_SWITCHES: EditorSwitches = {
  isTypewriterOn: () => false,
  isTypographyOn: () => true,
  mentionMatchers: () => [],
  onMention: () => undefined,
  repeatWindow: () => null,
  commentAnchors: () => [],
  onComment: () => undefined,
};

const writingKeys = keymap({
  "Mod-z": undo,
  "Mod-y": redo,
  "Shift-Mod-z": redo,
  "Mod-b": toggleBold,
  "Mod-i": toggleItalic,
  "Mod-Enter": insertSceneBreak,
  "Shift-Enter": insertLineBreak,
  Backspace: undoInputRule,
});

export function createEditorState(doc: Node, switches = DEFAULT_SWITCHES): EditorState {
  const writableDoc =
    doc.childCount > 0 ? doc : doc.copy(Fragment.from(schema.nodes.paragraph.create()));
  return EditorState.create({
    doc: writableDoc,
    plugins: [
      history(),
      search(),
      inputRules({ rules: [sceneBreakRule, ...typographyRules(switches.isTypographyOn)] }),
      writingKeys,
      keymap(baseKeymap),
      focusPlugin(),
      typewriterPlugin(switches.isTypewriterOn),
      mentionsPlugin(switches.mentionMatchers, switches.onMention),
      repetitionsPlugin(switches.repeatWindow),
      commentsPlugin(switches.commentAnchors, switches.onComment),
      placeholder(t("Börja skriva…")),
    ],
  });
}
