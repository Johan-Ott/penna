import type { DragEvent, ReactNode } from "react";
import { manuscriptWords } from "../../project/treeLabels.js";
import { FilterButton } from "../labels/LabelsInTree.js";
import { FoldIcon, FollowIcon, LocateIcon, UnfoldIcon } from "../shell/icons.js";
import { showInTree } from "./treeEffects.js";
import type { Tree, TreeViewProps } from "./useTreeView.js";
import { numberLocale, t } from "../../i18n/i18n.js";

function Tool(props: {
  label: string;
  isPressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className="tree-tool"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.isPressed}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

const FoldTools = ({ view }: { view: Tree["view"] }) => (
  <>
    <Tool label={t("Fäll ut alla")} onClick={view.unfoldAll}>
      <UnfoldIcon />
    </Tool>
    <Tool label={t("Fäll ihop alla")} onClick={view.foldAll}>
      <FoldIcon />
    </Tool>
  </>
);

const BookWords = ({ project }: Pick<TreeViewProps, "project">) => (
  <span className="tree-tools-words" aria-label={t("Ord i boken")}>
    {manuscriptWords(project.tree, project.summaries).toLocaleString(numberLocale())}
  </span>
);

/** Above the book: filter, find the open text, follow it, fold all, unfold all, and the words. */
export function TreeTools({ props, tree }: { props: TreeViewProps; tree: Tree }) {
  const { view, follow } = tree;
  const { project, openSceneId } = props;
  return (
    <div
      className="tree-tools"
      onDragOver={(event: DragEvent) => event.preventDefault()}
      onDrop={(event: DragEvent) => (event.preventDefault(), tree.dropAtBookEnd())}
    >
      <FilterButton props={props} view={view} />
      {openSceneId && (
        <Tool
          label={t("Visa den öppna texten")}
          onClick={() => showInTree(project.tree, openSceneId, view.expand)}
        >
          <LocateIcon />
        </Tool>
      )}
      <Tool
        label={t("Följ den öppna texten")}
        isPressed={follow.isFollowing}
        onClick={follow.toggle}
      >
        <FollowIcon />
      </Tool>
      <FoldTools view={view} />
      <BookWords project={project} />
    </div>
  );
}
