import { findNode, sceneIdsIn } from "../../project/tree.js";
import { nodeLabel } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { BackIcon } from "../shell/icons.js";
import type { Project } from "../useProject.js";
import { t } from "../../i18n/i18n.js";

interface PhoneSortProps {
  app: AppState;
  sortId: string;
  onOpen: (id: string) => void;
  onBack: () => void;
}

function SortBar({ home, sortId, onBack }: { home: Project; sortId: string; onBack: () => void }) {
  const sort = findNode(home.tree, sortId)?.node;
  return (
    <header className="phone-bar">
      <button className="link-button phone-back" onClick={onBack}>
        <BackIcon /> {t("Boken")}
      </button>
      <span className="phone-bar-title prose">
        {sort ? nodeLabel(sort, home.tree, home.summaries) : ""}
      </span>
      <span />
    </header>
  );
}

/** The notes of one sort on a phone, from the series or the book, and a way to add one. */
export function PhoneSort({ app, sortId, onOpen, onBack }: PhoneSortProps) {
  const home = app.homes.find((candidate) => findNode(candidate.tree, sortId));
  if (!home) return null;
  return (
    <div className="phone-screen">
      <SortBar home={home} sortId={sortId} onBack={onBack} />
      <main className="phone-card">
        {sceneIdsIn(home.tree, sortId).map((id) => (
          <button key={id} className="phone-row" onClick={() => onOpen(id)}>
            {home.summaries[id]?.title ?? ""}
          </button>
        ))}
        <button className="tree-add" onClick={() => app.setNewNoteSort(sortId)}>
          {t("+ Ny anteckning")}
        </button>
      </main>
    </div>
  );
}
