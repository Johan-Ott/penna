import { labelsOf } from "../../project/labels.js";
import { templatePieces, type BookTemplate } from "../../project/templates.js";
import { insertNode, type TreeNode } from "../../project/tree.js";
import { newSceneId } from "../../storage/sceneId.js";
import { platform } from "../platform.js";
import { createScene } from "../sceneSession.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

// Pieces added to a book that already exists: what it lacks of their notes, labels and chapters.

interface Additions {
  sorts: string[];
  labels: string[][];
  chapters: string[][];
}

/** The chosen pieces, and the notes and labels of an own template, as one set of additions. */
export function additionsOf(pieceIds: string[], own: BookTemplate | null): Additions {
  const pieces = templatePieces().filter((piece) => pieceIds.includes(piece.id));
  return {
    sorts: [...(own?.sorts ?? []), ...pieces.flatMap((piece) => piece.sorts)],
    labels: [...(own?.labels ?? []), ...pieces.flatMap((piece) => piece.labels)],
    chapters: pieces.flatMap((piece) => piece.chapters),
  };
}

const sortTitles = (tree: TreeNode[]) =>
  new Set(tree.filter((node) => node.kind === "sort").map((node) => node.title ?? ""));

function newLabels(project: Project, wanted: string[][]) {
  const current = labelsOf(project.fields);
  const names = new Set(current.map((label) => label.name));
  const added = wanted
    .filter(([name = ""]) => !names.has(name) && names.add(name))
    .map(([name = "", color = ""]) => ({ id: newSceneId(), name, color }));
  return added.length ? [...current, ...added] : null;
}

// Each closing chapter comes with an empty scene, at the end of the manuscript.
async function withChapters(project: Project, tree: TreeNode[], chapters: string[][]) {
  let next = tree;
  for (const [title = "", summary = ""] of chapters) {
    const sceneId = await createScene(platform.fileSystem, project.dir, t("Scen 1"));
    const chapter: TreeNode = {
      id: newSceneId(),
      kind: "chapter",
      title,
      summary,
      children: [{ id: sceneId, kind: "scene" }],
    };
    next = insertNode(next, chapter, null, Number.MAX_SAFE_INTEGER);
  }
  return next;
}

/** The book's tree and fields with the additions it does not have yet. */
export async function addToBook(project: Project, additions: Additions) {
  const have = sortTitles(project.tree);
  const sorts: TreeNode[] = [...new Set(additions.sorts)]
    .filter((title) => !have.has(title))
    .map((title) => ({ id: newSceneId(), kind: "sort", title, children: [] }));
  const tree = await withChapters(project, [...project.tree, ...sorts], additions.chapters);
  const labels = newLabels(project, additions.labels);
  return { tree, ...(labels ? { fields: { labels } } : {}) };
}
