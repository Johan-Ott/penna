import { useState, type ReactNode } from "react";
import { useEscape, useShortcut } from "../useShortcut.js";
import { AboutTab, ShortcutsTab } from "./infoTabs.js";
import { EditorTab, GeneralTab, SnapshotsTab, type TabProps } from "./settingsTabs.js";

const TABS: [string, (props: TabProps) => ReactNode][] = [
  ["Allmänt", GeneralTab],
  ["Editor", EditorTab],
  ["Ögonblicksbilder", SnapshotsTab],
  ["Kortkommandon", ShortcutsTab],
  ["Om Penna", AboutTab],
];

function TabList({ tab, onPick }: { tab: number; onPick: (tab: number) => void }) {
  return (
    <nav className="settings-tabs" aria-label="Inställningar">
      {TABS.map(([label], index) => (
        <button
          key={label}
          className={index === tab ? "settings-tab chosen" : "settings-tab"}
          aria-current={index === tab}
          onClick={() => onPick(index)}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

/** Inställningar, as in the design: the tabs on the left, one setting per row on the right. */
export function SettingsDialog(props: TabProps & { onClose: () => void }) {
  const [tab, setTab] = useState(0);
  useEscape(props.onClose);
  const [title, Content] = TABS[tab] ?? TABS[0] ?? ["", () => null];
  return (
    <div className="dialog-backdrop" onClick={props.onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Inställningar"
        onClick={(event) => event.stopPropagation()}
      >
        <TabList tab={tab} onPick={setTab} />
        <div className="settings-content">
          <div className="settings-heading">
            <h1>{title}</h1>
            <button className="link-button quiet" onClick={props.onClose}>
              Stäng
            </button>
          </div>
          <Content {...props} />
        </div>
      </div>
    </div>
  );
}

/** Whether Inställningar is open. Ctrl+, opens it, as in most desktop apps. */
export function useSettingsDialog() {
  const [isOpen, setOpen] = useState(false);
  useShortcut(",", () => setOpen(true));
  return { isOpen, open: () => setOpen(true), close: () => setOpen(false) };
}

export function SettingsLayer(props: TabProps & { dialog: ReturnType<typeof useSettingsDialog> }) {
  if (!props.dialog.isOpen) return null;
  return <SettingsDialog {...props} onClose={props.dialog.close} />;
}
