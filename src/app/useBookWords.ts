import { readSceneBodies } from "../project/sceneSummaries.js";
import { useEffect, useRef } from "react";
import { learnWords } from "../editor/vocabulary.js";
import type { useEditorView } from "../editor/useEditorView.js";
import { plainText } from "../manuscript/compare.js";
import { manuscriptSceneIds } from "../project/tree.js";
import { platform } from "./platform.js";
import type { Project } from "./useProject.js";

// A while after the book opens, so reading it all never slows the opening.
const AFTER_OPENING_MS = 3000;

async function bookTexts(book: Project) {
  const refs = manuscriptSceneIds(book.tree).map((id) => ({ dir: book.dir, id }));
  const bodies = await readSceneBodies(platform.fileSystem, refs);
  return Object.values(bodies).map((body) => plainText(body, "\n"));
}

/** The book's own words for the completion, learned once each time a book opens. */
export function useBookWords(editor: ReturnType<typeof useEditorView>, book: Project | null) {
  const latest = useRef(book);
  latest.current = book;
  const dir = book?.dir ?? null;
  useEffect(() => {
    if (!dir) return;
    let isCurrent = true;
    const timer = setTimeout(() => {
      const opened = latest.current;
      if (!opened) return;
      void bookTexts(opened).then((texts) => {
        if (!isCurrent) return;
        editor.modes.current.completion = {
          ...editor.modes.current.completion,
          ...learnWords(texts),
        };
      });
    }, AFTER_OPENING_MS);
    return () => ((isCurrent = false), clearTimeout(timer));
  }, [dir, editor.modes]);
}
