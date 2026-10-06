import { findNode } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { seriesTreeProps, sidebarProps } from "../paneProps.js";
import { BackIcon } from "../shell/icons.js";
import { SortNotes } from "../tree/TreeView.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

interface PhoneSortProps {
  app: AppState;
  sortId: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}

// A note in the series lives in the series' tree, with its own handlers.
const treePropsFor = (app: AppState, home: Project) =>
  app.project && home.dir === app.project.dir
    ? sidebarProps(app, app.project)
    : seriesTreeProps(app, home);

function nameOf(home: Project, sortId: string) {
  const sort = findNode(home.tree, sortId)?.node;
  return sort ? nodeLabel(sort, home.tree, home.summaries) : "";
}

function SortBar({ home, sortId, onBack }: { home: Project; sortId: string; onBack: () => void }) {
  return (
    <header className="phone-bar">
      <button className="link-button phone-back" onClick={onBack}>
        <BackIcon /> {t("Boken")}
      </button>
      <span className="phone-bar-title prose">{nameOf(home, sortId)}</span>
      <span />
    </header>
  );
}

export function PhoneSort({ app, sortId, onOpen, onBack }: PhoneSortProps) {
  const home = app.homes.find((candidate) => findNode(candidate.tree, sortId));
  if (!home) return null;
  return (
    <div className="phone-screen">
      <SortBar home={home} sortId={sortId} onBack={onBack} />
      <main className="phone-card">
        <SortNotes
          {...treePropsFor(app, home)}
          onOpenScene={onOpen}
          sortId={sortId}
          name={nameOf(home, sortId)}
        />
        <button className="tree-add" onClick={() => app.setNewNoteSort(sortId)}>
          {t("+ Ny anteckning")}
        </button>
      </main>
    </div>
  );
}
