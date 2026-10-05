import { useEffect, useMemo, useState } from "react";
import { plainText } from "../../manuscript/compare.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { cardsOf, countMentions, type Card } from "../../project/cards.js";
import { findNode, manuscriptSceneIds } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

export interface ShownMention {
  id: string;
  box: DOMRect;
}

interface TextRef {
  dir: string;
  id: string;
}

async function readTexts(refs: TextRef[]) {
  const texts: Record<string, string> = {};
  for (const { dir, id } of refs) {
    const file = await platform.fileSystem
      .readText(joinPath(dir, `scenes/${id}.md`))
      .catch(() => null);
    if (file !== null) texts[id] = plainText(splitSceneFile(file).body, "\n");
  }
  return texts;
}

// Read only while a note or name card shows, so an ordinary save does not read the whole book.
function useTexts(refs: TextRef[], version: unknown, isWanted: boolean) {
  const [texts, setTexts] = useState<Record<string, string>>({});
  const key = refs.map((ref) => `${ref.dir}|${ref.id}`).join(",");
  useEffect(() => {
    if (!isWanted) return;
    let isCurrent = true;
    const wanted = key ? key.split(",").map((entry) => entry.split("|")) : [];
    void readTexts(wanted.map(([dir = "", id = ""]) => ({ dir, id }))).then(
      (read) => isCurrent && setTexts(read),
    );
    return () => void (isCurrent = false);
  }, [key, version, isWanted]);
  return texts;
}

export interface NoteCard extends Card {
  dir: string;
  sortLabel: string;
}

function noteCards(homes: Project[]): NoteCard[] {
  return homes.flatMap((home) =>
    cardsOf(home.tree, home.summaries).map((card) => {
      const sort = findNode(home.tree, card.sortId)?.node;
      const sortLabel = sort ? nodeLabel(sort, home.tree, home.summaries) : "";
      return { ...card, dir: home.dir, sortLabel };
    }),
  );
}

const firstSentence = (text: string) => (text.trim().match(/^[^.!?\n]*/)?.[0] ?? "").trim();

/** `homes` must keep its identity between renders (useMemo), or the texts are read every time. */
export function useNotes(homes: Project[], book: Project | null, isNoteOpen: boolean) {
  const cards = useMemo(() => noteCards(homes), [homes]);
  const [mention, setMention] = useState<ShownMention | null>(null);
  const isWanted = isNoteOpen || mention !== null;
  const manuscriptRefs = useMemo(
    () => (book ? manuscriptSceneIds(book.tree).map((id) => ({ dir: book.dir, id })) : []),
    [book],
  );
  const manuscript = useTexts(manuscriptRefs, book, isWanted);
  const noteTexts = useTexts(cards, homes, isWanted);
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
