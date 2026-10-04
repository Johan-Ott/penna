import { useEffect, useMemo } from "react";
import { refreshMentions } from "../../editor/mentions.js";
import type { useEditorView } from "../../editor/useEditorView.js";
import { mentionPattern } from "../../project/cards.js";
import type { usePlanning } from "./usePlanning.js";

/**
 * Gives the editor the titles in Karaktärer and Platser and passes clicks on them on. When they
 * change the text is underlined again at once, so a new character is linked straight away.
 */
export function useMentionLinks(
  editor: ReturnType<typeof useEditorView>,
  planning: ReturnType<typeof usePlanning>,
) {
  const matchers = useMemo(
    () => planning.cards.map((card) => ({ id: card.id, pattern: mentionPattern(card.name) })),
    [planning.cards],
  );
  editor.modes.current.mentionMatchers = matchers;
  editor.modes.current.onMention = planning.showMention;
  const { run } = editor;
  useEffect(() => run(refreshMentions, false), [matchers, run]);
}
