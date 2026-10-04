import { useEffect, useMemo } from "react";
import { refreshMentions } from "../../editor/mentions.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { mentionPattern } from "../../project/cards.js";
import type { Notes } from "./useNotes.js";

/**
 * Gives the editor the names of the linked notes and passes clicks on them on. When they change
 * the text is underlined again at once, so a new person is linked straight away.
 */
export function useMentionLinks(editor: ReturnType<typeof useEditorView>, notes: Notes) {
  const matchers = useMemo(
    () => notes.cards.map((card) => ({ id: card.id, pattern: mentionPattern(card.name) })),
    [notes.cards],
  );
  editor.modes.current.mentionMatchers = matchers;
  editor.modes.current.onMention = notes.showMention;
  const { run } = editor;
  useEffect(() => run(refreshMentions, false), [matchers, run]);
}
