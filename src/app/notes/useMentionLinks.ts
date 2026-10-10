import { useEffect, useMemo } from "react";
import { refreshMentions } from "../../editor/mentions.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { mentionPattern } from "../../project/cards.js";
import type { Notes } from "./useNotes.js";

/** The text is underlined again as soon as the names change, so a new person is linked at once. */
export function useMentionLinks(editor: ReturnType<typeof useEditorView>, notes: Notes) {
  const matchers = useMemo(
    () => notes.cards.map((card) => ({ id: card.id, pattern: mentionPattern(card.name) })),
    [notes.cards],
  );
  editor.modes.current.mentionMatchers = matchers;
  // Offered while typing too, the whole name and the first name alone: "Arvid Holm", "Arvid".
  editor.modes.current.completionNames = useMemo(
    () => [...new Set(notes.cards.flatMap((card) => [card.name, card.name.split(/\s+/)[0] ?? ""]))],
    [notes.cards],
  );
  editor.modes.current.onMention = notes.showMention;
  const { run } = editor;
  useEffect(() => run(refreshMentions, false), [matchers, run]);
}
