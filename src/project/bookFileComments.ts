import { documentText } from "../editor/documentText.js";
import { parseMarkdown } from "../manuscript/parseMarkdown.js";
import { splitSceneFile } from "../manuscript/sceneFile.js";
import { scenePath } from "../storage/fileSystem.js";
import type { BookFolder } from "./bookFolder.js";
import { anchorAt, newComment, readComments, writeComments } from "./comments.js";

// Comments on a scene's text, anchored the way the app anchors them: on the text as the editor
// shows it, so a quote is found even where the Markdown has * or _ around words.

async function shownText(book: BookFolder, id: string) {
  const { body } = splitSceneFile(await book.fileSystem.readText(scenePath(book.dir, id)));
  return documentText(parseMarkdown(body)).text;
}

export const commentCalls = (book: BookFolder) => ({
  comments: (id: string) => readComments(book.fileSystem, book.dir, id),
  /** A comment on the first place the quote stands in the scene; its id is the answer. */
  comment: async (id: string, quote: string, text: string, author = "Läsare") => {
    const shown = await shownText(book, id);
    const from = quote === "" ? -1 : shown.indexOf(quote);
    if (from < 0) throw new Error(`Citatet "${quote}" står inte i scenen. Skriv det ordagrant.`);
    const comment = newComment(anchorAt(shown, from, from + quote.length), text, author);
    const earlier = await readComments(book.fileSystem, book.dir, id);
    await writeComments(book.fileSystem, book.dir, id, [...earlier, comment]);
    return comment.id;
  },
});
