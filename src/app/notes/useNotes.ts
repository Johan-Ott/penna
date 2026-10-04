import { useEffect, useMemo, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { cardsOf, countMentions } from "../../project/cards.js";
import { manuscriptSceneIds } from "../../project/tree.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

/** A name clicked in the text: which note, and where the name is on screen. */
export interface ShownMention {
  id: string;
  box: DOMRect;
}

async function readTexts(project: Project, ids: string[]) {
  const texts: Record<string, string> = {};
  for (const id of ids) {
    const file = await platform.fileSystem
      .readText(joinPath(project.dir, `scenes/${id}.md`))
      .catch(() => null);
    if (file !== null) texts[id] = plainText(splitSceneFile(file).body, "\n");
  }
  return texts;
}

// Read only while a note or a name card is shown, so an ordinary save does not read the book.
function useTexts(project: Project | null, ids: string[], isWanted: boolean) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (!project || !isWanted) return;
    let isCurrent = true;
    void readTexts(project, key ? key.split(",") : []).then((read) => isCurrent && setTexts(read));
    return () => void (isCurrent = false);
  }, [project, key, isWanted]);
  return texts;
}

// "Fiskare, fyrens siste vakt": the first sentence of a note says who or what it is.
const firstSentence = (text: string) => (text.trim().match(/^[^.!?\n]*/)?.[0] ?? "").trim();

/** The notes linked in the text, where each is named, and the name card shown over the text. */
export function useNotes(project: Project | null, isNoteOpen: boolean) {
  const cards = useMemo(() => (project ? cardsOf(project.tree, project.summaries) : []), [project]);
  const [mention, setMention] = useState<ShownMention | null>(null);
  const isWanted = isNoteOpen || mention !== null;
  const manuscriptIds = useMemo(() => (project ? manuscriptSceneIds(project.tree) : []), [project]);
  const cardIds = useMemo(() => cards.map((card) => card.id), [cards]);
  const manuscript = useTexts(project, manuscriptIds, isWanted);
  const noteTexts = useTexts(project, cardIds, isWanted);
  const mentions = useMemo(() => countMentions(cards, manuscript), [cards, manuscript]);
  return {
    cards,
    mentions,
    descriptionOf: (id: string) => firstSentence(noteTexts[id] ?? ""),
    mention,
    showMention: (id: string, box: DOMRect) => setMention({ id, box }),
    hideMention: () => setMention(null),
  };
}

export type Notes = ReturnType<typeof useNotes>;
