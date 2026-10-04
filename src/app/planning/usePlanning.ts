import { useEffect, useMemo, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { cardsOf, countMentions, entriesIn } from "../../project/cards.js";
import { manuscriptSceneIds, NOTES_ID, TIMELINE_ID } from "../../project/tree.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

/** A name clicked in the text: which card, and where the name is on screen. */
export interface ShownMention {
  id: string;
  box: DOMRect;
}

// How much of a card's text its card in Planera shows.
const EXCERPT_LENGTH = 180;

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

// Read only while Planera or a card in the text is shown, so a save does not read the book.
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

const excerptOf = (text: string) =>
  text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;

// The timeline's events and the notes, listed in Planera in tree order.
function usePlanLists(project: Project | null) {
  return useMemo(() => {
    const listOf = (folder: string) =>
      project ? entriesIn(project.tree, project.summaries, folder) : [];
    return { timeline: listOf(TIMELINE_ID), notes: listOf(NOTES_ID) };
  }, [project]);
}

/** Planera's cards and lists, what their texts begin with, and how often the cards are named. */
export function usePlanning(project: Project | null, isVisible: boolean) {
  const cards = useMemo(() => (project ? cardsOf(project.tree, project.summaries) : []), [project]);
  const lists = usePlanLists(project);
  const [mention, setMention] = useState<ShownMention | null>(null);
  const isWanted = isVisible || mention !== null;
  const manuscriptIds = useMemo(() => (project ? manuscriptSceneIds(project.tree) : []), [project]);
  const planIds = useMemo(
    () => [...cards, ...lists.timeline, ...lists.notes].map((entry) => entry.id),
    [cards, lists],
  );
  const manuscript = useTexts(project, manuscriptIds, isWanted);
  const planTexts = useTexts(project, planIds, isWanted);
  const mentions = useMemo(() => countMentions(cards, manuscript), [cards, manuscript]);
  return {
    cards,
    ...lists,
    mentions,
    excerptOf: (id: string) => excerptOf((planTexts[id] ?? "").trim()),
    mention,
    showMention: (id: string, box: DOMRect) => setMention({ id, box }),
    hideMention: () => setMention(null),
  };
}
