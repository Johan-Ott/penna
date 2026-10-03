import { useState } from "react";
import type { SceneFileRef } from "../storage/syncFiles.js";
import { Menu } from "./Menu.js";
import { SyncNotices } from "./SyncLayer.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";

interface SidebarProps extends TreeViewProps {
  onShowShelf: () => void;
  onShowSyncCopy: (copy: SceneFileRef) => void;
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
      <section className="structure" aria-label="Struktur">
        <div className="section-heading">
          <span>Struktur</span>
          <NewButton onAdd={props.onAdd} />
        </div>
        <TreeView {...props} />
      </section>
      <SyncNotices project={props.project} onShowSyncCopy={props.onShowSyncCopy} />
    </nav>
  );
}
