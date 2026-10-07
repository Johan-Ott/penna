import { useState } from "react";
import type { Label } from "../../project/labels.js";
import { groupLabel } from "./CommandPalette.js";
import { inGroups, type PaletteEntry } from "./paletteSearch.js";
import { t } from "../../i18n/i18n.js";

const flip = (list: string[], item: string) =>
  list.includes(item) ? list.filter((each) => each !== item) : [...list, item];

// A kind and a label chosen together narrow to both: scenes with that label.
export function usePaletteFilter(entries: PaletteEntry[], labels: Label[]) {
  const [groups, setGroups] = useState<string[]>([]);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const kinds = inGroups([...new Map(entries.map((entry) => [entry.group, entry])).values()]);
  const kept = entries.filter(
    (entry) =>
      (groups.length === 0 || groups.includes(entry.group)) &&
      (labelIds.length === 0 || entry.labels?.some((id) => labelIds.includes(id))),
  );
  return {
    kinds: kinds.map((entry) => entry.group),
    labels,
    groups,
    labelIds,
    toggleGroup: (group: string) => setGroups(flip(groups, group)),
    toggleLabel: (id: string) => setLabelIds(flip(labelIds, id)),
    kept,
  };
}

type Filter = ReturnType<typeof usePaletteFilter>;

function Chip(props: { isOn: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <button
      className="chip"
      aria-pressed={props.isOn}
      onMouseDown={(event) => event.preventDefault()}
      onClick={props.onToggle}
    >
      {props.children}
    </button>
  );
}

/** One chip per kind and per label; with none chosen everything is searched. */
export function PaletteFilters(props: Filter & { onPicked: () => void }) {
  const picked = (change: () => void) => () => (change(), props.onPicked());
  return (
    <div className="palette-filters" role="group" aria-label={t("Visa bara")}>
      {props.kinds.map((group) => (
        <Chip
          key={group}
          isOn={props.groups.includes(group)}
          onToggle={picked(() => props.toggleGroup(group))}
        >
          {groupLabel(group)}
        </Chip>
      ))}
      {props.labels.map((label) => (
        <Chip
          key={label.id}
          isOn={props.labelIds.includes(label.id)}
          onToggle={picked(() => props.toggleLabel(label.id))}
        >
          <span className="tree-dot" style={{ background: label.color }} /> {label.name}
        </Chip>
      ))}
    </div>
  );
}
