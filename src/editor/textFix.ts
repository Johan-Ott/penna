import { EditorState } from "prosemirror-state";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { joinSceneFile, splitSceneFile } from "../manuscript/sceneFile.js";
import { serializeMarkdown } from "../manuscript/serializeMarkdown.js";
import { locate, type Anchor } from "../project/comments.js";
import { documentText } from "./documentText.js";

/** The scene file with the quoted words replaced, or null when the words are not in it. */
export function fixedSceneText(sceneText: string, anchor: Anchor, replacement: string) {
  const { frontMatter, body } = splitSceneFile(sceneText);
  const doc = parseMarkdown(body);
  const { text, toDoc } = documentText(doc);
  const found = locate(text, anchor);
  if (!found) return null;
  const fixed = EditorState.create({ doc }).tr.insertText(
    replacement,
    toDoc(found.from),
    toDoc(found.to),
  ).doc;
  return joinSceneFile({ frontMatter, body: serializeMarkdown(fixed) });
}
