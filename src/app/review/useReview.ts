import type { Node } from "prosemirror-model";
import { useEffect, useMemo, useState } from "react";
import { sceneRepetitions } from "../../editor/repetitionMarks.js";
import { plainText } from "../../manuscript/compare.js";
import { nameSuspects } from "../../manuscript/review.js";
import { splitSceneFile } from "../../manuscript/sceneFile.js";
import { mentionPattern, type Card } from "../../project/cards.js";
import { findNode } from "../../project/tree.js";
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

// The other scenes of the open scene's chapter, read when the chapter changes, not on each save.
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

/** What the review panel shows for the open scene: who is in the chapter, and what to look at. */
export function useReview({ project, scene, doc, cards, repeatWindow }: ReviewInput) {
  const chapterTexts = useChapterTexts(project, scene.id);
  const sceneText = doc.textBetween(0, doc.content.size, "\n");
  const inChapter = useMemo(() => {
    const text = [sceneText, ...chapterTexts].join("\n");
    return cards.filter((card) => card.id !== scene.id && mentionPattern(card.name)?.test(text));
  }, [cards, sceneText, chapterTexts, scene.id]);
  const names = cards.map((card) => card.name);
  const suspects = nameSuspects({ [scene.id]: sceneText }, names, ignoredNames(project));
  const repeats = sceneRepetitions(doc, repeatWindow);
  return { inChapter, suspects, repeats, ignored: ignoredNames(project) };
}
