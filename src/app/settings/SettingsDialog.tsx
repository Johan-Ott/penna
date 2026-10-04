import { useState, type ReactNode } from "react";
import { useEscape, useShortcut } from "../useShortcut.js";
import { AboutTab, ShortcutsTab } from "./infoTabs.js";
import { GeneralTab } from "./generalTab.js";
import { EditorTab, VersionsTab, type TabProps } from "./settingsTabs.js";
import { t } from "../../i18n/i18n.js";

const TABS: [string, (props: TabProps) => ReactNode][] = [
  [t("Allmänt"), GeneralTab],
  [t("Editor"), EditorTab],
  [t("Versioner"), VersionsTab],
  [t("Kortkommandon"), ShortcutsTab],
  ["Om Penna", AboutTab],
];

/** Kortkommandon, opened straight from Hjälp och kortkommandon in the menu. */
export const SHORTCUTS_TAB = 3;

function TabList({ tab, onPick }: { tab: number; onPick: (tab: number) => void }) {
  return (
    <nav className="settings-tabs" aria-label={t("Inställningar")}>
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
export function SettingsDialog(props: TabProps & { startTab: number; onClose: () => void }) {
  const [tab, setTab] = useState(props.startTab);
  useEscape(props.onClose);
  const [title, Content] = TABS[tab] ?? TABS[0] ?? ["", () => null];
  return (
    <div className="dialog-backdrop" onClick={props.onClose}>
      <div
        className="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("Inställningar")}
        onClick={(event) => event.stopPropagation()}
      >
        <TabList tab={tab} onPick={setTab} />
        <div className="settings-content">
          <div className="settings-heading">
            <h1>{title}</h1>
            <button className="link-button quiet" onClick={props.onClose}>
              {t("Stäng")}
            </button>
          </div>
          <Content {...props} />
        </div>
      </div>
    </div>
  );
}

/** Which tab of Inställningar is open, or null. Ctrl+, opens it, as in most desktop apps. */
export function useSettingsDialog() {
  const [openTab, setOpenTab] = useState<number | null>(null);
  useShortcut(",", () => setOpenTab(0));
  return {
    openTab,
    open: (tab = 0) => setOpenTab(tab),
    close: () => setOpenTab(null),
  };
}

export function SettingsLayer(props: TabProps & { dialog: ReturnType<typeof useSettingsDialog> }) {
  if (props.dialog.openTab === null) return null;
  return <SettingsDialog {...props} startTab={props.dialog.openTab} onClose={props.dialog.close} />;
}
