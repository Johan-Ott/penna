import { useState } from "react";
import { sceneRows, withSceneMoved, type ContentsRow } from "../../project/contents.js";
import type { TreeNode } from "../../project/tree.js";
import type { Project } from "../useProject.js";
import { Row, type RowProps } from "./ContentsRowView.js";

type DropEvent = { preventDefault: () => void; stopPropagation: () => void };

/** A scene dragged onto another scene goes before it; onto a chapter, last in it. */
export function useSceneDrag(project: Project, onChangeTree: (tree: TreeNode[]) => void) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const dropOn = (chapterId: string, beforeId: string | null) => (event: DropEvent) => {
    event.stopPropagation();
    if (draggedId && draggedId !== beforeId)
      onChangeTree(withSceneMoved(project.tree, draggedId, chapterId, beforeId));
    setDraggedId(null);
  };
  const target = (chapterId: string, beforeId: string | null) => ({
    onDragOver: (event: DropEvent) => draggedId && event.preventDefault(),
    onDrop: dropOn(chapterId, beforeId),
  });
  return {
    forChapter: (chapterId: string) => target(chapterId, null),
    forScene: (chapterId: string, sceneId: string) => ({
      ...target(chapterId, sceneId),
      draggable: true,
      onDragStart: () => setDraggedId(sceneId),
      onDragEnd: () => setDraggedId(null),
    }),
  };
}

export type SceneDrag = ReturnType<typeof useSceneDrag>;

/** Under an unfolded chapter: one row per scene, dragged within the chapter or to another. */
export function SceneRows(
  props: Omit<RowProps, "row" | "pages" | "dragProps"> & {
    chapterId: string;
    drag: SceneDrag;
    isShown: (row: ContentsRow) => boolean;
  },
) {
  const { project, chapterId, drag } = props;
  return sceneRows(project.tree, project.summaries, chapterId).map((row) => (
    <Row
      key={row.id}
      {...props}
      row={row}
      pages={null}
      isScene
      dragProps={drag.forScene(chapterId, row.id)}
      isDimmed={!props.isShown(row)}
    />
  ));
}
