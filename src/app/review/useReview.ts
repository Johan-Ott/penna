import type { Node } from "prosemirror-model";
import { useEffect, useMemo, useState } from "react";
import { PAUSE_MS, sceneRepetitions } from "../../editor/repetitionMarks.js";
import { plainText } from "../../manuscript/compare.js";
import { nameSuspects } from "../../manuscript/review.js";
import { narrationNotes, narrationOf } from "../../manuscript/narration.js";
import { proseNotes, type ProseNote } from "../../manuscript/prose.js";
import { splitCompounds } from "../../manuscript/compounds.js";
import { bookLanguage } from "../../project/bookLanguage.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { mentionPattern, type Card } from "../../project/cards.js";
import { CHARACTERS_ID, findNode } from "../../project/tree.js";
import { chapterOf } from "../../project/treeLabels.js";
import { joinPath } from "../../storage/fileSystem.js";
import { platform } from "../platform.js";
import type { OpenScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";

interface ReviewInput {
  project: Project;
  scene: OpenScene;
  doc: Node;
  cards: Card[];
  repeatWindow: number;
}

const ignoredNames = (project: Project) =>
  Array.isArray(project.fields["ignoredNames"])
    ? project.fields["ignoredNames"].filter((name): name is string => typeof name === "string")
    : [];

// Read when the chapter changes, not on each save.
function useChapterTexts(project: Project, sceneId: string) {
  const chapter = chapterOf(project.tree, sceneId);
  const ids = (chapter ? (findNode(project.tree, chapter.id)?.node.children ?? []) : [])
    .filter((child) => child.kind === "scene" && child.id !== sceneId)
    .map((child) => child.id);
  const key = ids.join(",");
  const [texts, setTexts] = useState<string[]>([]);
  useEffect(() => {
    let isCurrent = true;
    const read = (id: string) =>
      platform.fileSystem.readText(joinPath(project.dir, `scenes/${id}.md`)).catch(() => "");
    void Promise.all((key ? key.split(",") : []).map(read)).then(
      (files) => isCurrent && setTexts(files.map((file) => plainText(splitSceneFile(file).body))),
    );
    return () => void (isCurrent = false);
  }, [project.dir, key]);
  return texts;
}

// The people whose eyes the chapter is not seen through; none when no one is named under Vems ögon.
function othersThan(project: Project, sceneId: string, cards: Card[]) {
  const chapter = chapterOf(project.tree, sceneId);
  const pov = (chapter ? findNode(project.tree, chapter.id)?.node.pov : "") ?? "";
  if (!pov.trim()) return [];
  const people = cards.filter((card) => card.sortId === CHARACTERS_ID);
  return people.map((card) => card.name).filter((name) => !pov.includes(name));
}

// The text as it was at the writer's last pause, so Granska does not count on every key.
function useSettled(doc: Node) {
  const [settled, setSettled] = useState(doc);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(doc), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [doc]);
  return settled;
}

// Asked of Penna's own dictionary at each pause, so only where the platform has one.
function useSplitCompounds(text: string, language: string) {
  const [notes, setNotes] = useState<ProseNote[]>([]);
  useEffect(() => {
    const spelling = platform.spelling;
    if (!spelling) return setNotes([]);
    let isCurrent = true;
    void splitCompounds(text, language, (words) => spelling.misspelled(language, words)).then(
      (found) => isCurrent && setNotes(found),
    );
    return () => void (isCurrent = false);
  }, [text, language]);
  return notes;
}

export function useReview({ project, scene, doc: current, cards, repeatWindow }: ReviewInput) {
  const doc = useSettled(current);
  const chapterTexts = useChapterTexts(project, scene.id);
  const sceneText = doc.textBetween(0, doc.content.size, "\n");
  const inChapter = useMemo(() => {
    const text = [sceneText, ...chapterTexts].join("\n");
    return cards.filter((card) => card.id !== scene.id && mentionPattern(card.name)?.test(text));
  }, [cards, sceneText, chapterTexts, scene.id]);
  const suspects = useMemo(() => {
    const names = cards.map((card) => card.name);
    return nameSuspects({ [scene.id]: sceneText }, names, ignoredNames(project));
  }, [cards, sceneText, scene.id, project]);
  const repeats = useMemo(() => sceneRepetitions(doc, repeatWindow), [doc, repeatWindow]);
  const language = bookLanguage(project.fields);
  const prose = useMemo(() => {
    const narration = narrationOf(project.fields);
    const others = othersThan(project, scene.id, cards);
    return [
      ...proseNotes(sceneText, language),
      ...narrationNotes(sceneText, language, narration, others),
    ];
  }, [sceneText, language, project, scene.id, cards]);
  return {
    inChapter,
    suspects,
    repeats,
    prose: [...prose, ...useSplitCompounds(sceneText, language)],
    ignored: ignoredNames(project),
  };
}
