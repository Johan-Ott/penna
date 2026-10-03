import { baseKeymap } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { InputRule, inputRules, undoInputRule } from "prosemirror-inputrules";
import { keymap } from "prosemirror-keymap";
import { Fragment, type Node } from "prosemirror-model";
import { search } from "prosemirror-search";
import { EditorState } from "prosemirror-state";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { insertLineBreak, insertSceneBreak, toggleBold, toggleItalic } from "./commands.js";
import { focusPlugin, typewriterPlugin } from "./focus.js";
import { placeholder } from "./placeholder.js";

// Swedish typography as the writer types: Swedish uses ” for both opening and closing quotes.
const swedishTypography = inputRules({
  rules: [
    new InputRule(/--$/, "–"),
    new InputRule(/\.\.\.$/, "…"),
    new InputRule(/"$/, "”"),
    new InputRule(/'$/, "’"),
  ],
});

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

const typewriterOff = () => false;

/** `isTypewriterOn` is asked on every update, so the mode can change while the writer types. */
export function createEditorState(doc: Node, isTypewriterOn = typewriterOff): EditorState {
  const writableDoc =
    doc.childCount > 0 ? doc : doc.copy(Fragment.from(schema.nodes.paragraph.create()));
  return EditorState.create({
    doc: writableDoc,
    plugins: [
      history(),
      search(),
      swedishTypography,
      writingKeys,
      keymap(baseKeymap),
      focusPlugin(),
      typewriterPlugin(isTypewriterOn),
      placeholder("Börja skriva…"),
    ],
  });
}
