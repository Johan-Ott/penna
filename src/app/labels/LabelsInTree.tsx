import { hasLabel, labelsOf, withLabel, type Label } from "../../project/labels.js";
import type { TreeNode } from "../../project/tree.js";
import type { MenuItem } from "../Menu.js";
import type { Tree, TreeViewProps } from "../tree/useTreeView.js";
import { LabelsDialog } from "./LabelsDialog.js";
import { t } from "../../i18n/i18n.js";

// The book's labels to tick; with any ticked the tree shows only what has one of them.
function filterItems(labels: Label[], view: Tree["view"]): MenuItem[] {
  const { filter, setFilter } = view;
  const flip = (id: string) =>
    setFilter(filter.includes(id) ? filter.filter((each) => each !== id) : [...filter, id]);
  const items = labels.map((label) => ({
    label: label.name,
    isChecked: filter.includes(label.id),
    onSelect: () => flip(label.id),
  }));
  if (filter.length === 0) return items;
  return [
    ...items,
    { label: t("Visa allt"), separatorBefore: true, onSelect: () => setFilter([]) },
  ];
}

export function FilterButton({ props, view }: { props: TreeViewProps; view: Tree["view"] }) {
  const labels = labelsOf(props.project.fields);
  if (labels.length === 0) return null;
  const count = view.filter.length;
  return (
    <button
      className="tree-filter"
      aria-pressed={count > 0}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        view.setMenu({ items: filterItems(labels, view), x: box.left, y: box.bottom + 4 });
      }}
    >
      {count > 0 ? t("Filter · {count}", { count }) : t("Filtrera")}
    </button>
  );
}

export function LabelsLayer({ props, view }: { props: TreeViewProps; view: Tree["view"] }) {
  const { labelsFor, setLabelsFor } = view;
  if (!labelsFor || !props.onUpdateProject) return null;
  return (
    <LabelsDialog
      project={props.project}
      nodeId={labelsFor}
      onUpdate={props.onUpdateProject}
      onClose={() => setLabelsFor(null)}
    />
  );
}

/** The row menu's Labels: each label ticked on or off at once, and the dialog for new ones. */
export function labelMenu(props: TreeViewProps, view: Tree["view"]) {
  const { project, onUpdateProject } = props;
  if (!onUpdateProject) return null;
  return (node: TreeNode): MenuItem[] => {
    const labels = labelsOf(project.fields);
    const ticks = labels.map((label) => {
      const isOn = hasLabel(project.tree, node.id, label.id);
      const tree = () => withLabel(project.tree, node.id, label.id, !isOn);
      return {
        label: label.name,
        isChecked: isOn,
        onSelect: () => onUpdateProject({ tree: tree() }),
      };
    });
    const dialog = labels.length > 0 ? t("Hantera labels…") : t("Ny label…");
    const open = () => view.setLabelsFor(node.id);
    return [...ticks, { label: dialog, separatorBefore: labels.length > 0, onSelect: open }];
  };
}
