import { useState } from "react";
import { Menu } from "./Menu.js";
import { addMenu } from "./tree/treeMenus.js";
import { TreeView, type TreeViewProps } from "./tree/TreeView.js";
import type { Project } from "./useProject.js";

interface SidebarProps extends TreeViewProps {
  onChooseFolder: () => void;
}

function Notices({ project }: { project: Project }) {
  const notices = [
    ...(project.repairCopy
      ? [`project.json gick inte att läsa. En kopia sparades som ${project.repairCopy}.`]
      : []),
    ...project.conflicts.map((copy) => `Konfliktkopia: ${copy.fileName}`),
    ...project.notDownloaded.map((file) => `Hämtar ${file.sceneId} från molnet…`),
    ...project.recoverable.map(() => "Osparad text från en krasch kan återställas"),
  ];
  if (notices.length === 0) return null;
  return (
    <ul className="sidebar-notices" aria-label="Att se över">
      {notices.map((notice) => (
        <li key={notice}>{notice}</li>
      ))}
    </ul>
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
      <button className="project-card" onClick={props.onChooseFolder} title="Byt projektmapp">
        <span className="project-name">{props.project.name}</span>
        <span className="project-hint">Byt mapp</span>
      </button>
      <section className="structure" aria-label="Struktur">
        <div className="section-heading">
          <span>Struktur</span>
          <NewButton onAdd={props.onAdd} />
        </div>
        <TreeView {...props} />
      </section>
      <Notices project={props.project} />
    </nav>
  );
}
