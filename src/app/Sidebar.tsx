import { useState } from "react";
import type { SceneFileRef } from "../storage/syncFiles.js";
import { Menu } from "./Menu.js";
import { SyncNotices } from "./SyncLayer.js";
import type { Today } from "./useWritingStats.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";

interface SidebarProps extends TreeViewProps {
  onShowShelf: () => void;
  onShowSyncCopy: (copy: SceneFileRef) => void;
  today: Today;
  view: View;
  onView: (view: View) => void;
}

/** The views of an open project. Bokdesign joins when it is built. */
export type View = "skriv" | "planera" | "framsteg" | "exportera";
export const VIEWS: [View, string, string][] = [
  ["skriv", "Skriv", "G S"],
  ["planera", "Planera", "G P"],
  ["framsteg", "Framsteg", "G F"],
  ["exportera", "Exportera", "G E"],
];

function ViewMenu({ view, onView }: Pick<SidebarProps, "view" | "onView">) {
  return (
    <div className="view-menu">
      {VIEWS.map(([id, label, keys]) => (
        <button
          key={id}
          className={id === view ? "view-item chosen" : "view-item"}
          aria-current={id === view ? "page" : undefined}
          onClick={() => onView(id)}
        >
          <span>{label}</span>
          <span className="view-keys">{keys}</span>
        </button>
      ))}
    </div>
  );
}

const dayCount = (days: number) => (days === 1 ? "1 dag i rad" : `${days} dagar i rad`);

function TodayCard({ today }: { today: Today }) {
  const words = today.words.toLocaleString("sv-SE");
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : null;
  return (
    <div className="today-card">
      <div className="today-row">
        <span className="today-label">Idag</span>
        <span className="today-words">
          {today.goal ? `${words} / ${today.goal.toLocaleString("sv-SE")} ord` : `${words} ord`}
        </span>
      </div>
      {share !== null && (
        <div
          className="progress-bar"
          role="progressbar"
          aria-label="Dagens ordmål"
          aria-valuenow={Math.round(share)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div style={{ width: `${share}%` }} />
        </div>
      )}
      {today.streak > 0 && <span className="today-streak">{dayCount(today.streak)}</span>}
    </div>
  );
}

function NewButton({ onAdd }: Pick<SidebarProps, "onAdd">) {
  const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
  return (
    <>
      <button
        className="small-icon-button"
        aria-label="Lägg till"
        aria-haspopup="menu"
        onClick={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          setMenuAt({ x: box.left, y: box.bottom + 4 });
        }}
      >
        +
      </button>
      {menuAt && (
        <Menu
          {...menuAt}
          label="Lägg till"
          items={addMenu({ add: onAdd })}
          onClose={() => setMenuAt(null)}
        />
      )}
    </>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Huvudmeny">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          P
        </span>
        <span className="brand-name">Penna</span>
      </div>
      <button className="project-card" onClick={props.onShowShelf} title="Till bokhyllan">
        <span className="project-name">{props.project.name}</span>
        <span className="project-hint">Bokhylla</span>
      </button>
      <ViewMenu {...props} />
      <section className="structure" aria-label="Struktur">
        <div className="section-heading">
          <span>Struktur</span>
          <NewButton onAdd={props.onAdd} />
        </div>
        <TreeView {...props} />
      </section>
      <div className="sidebar-footer">
        <SyncNotices project={props.project} onShowSyncCopy={props.onShowSyncCopy} />
        <TodayCard today={props.today} />
      </div>
    </nav>
  );
}
