import { useState, type ReactNode } from "react";
import { useEscape, useShortcut } from "../useShortcut.js";
import { AboutTab, ShortcutsTab } from "./infoTabs.js";
import { GeneralTab } from "./generalTab.js";
import { HelpTab } from "./helpTab.js";
import { SyncTab } from "./syncTab.js";
import { EditorTab, VersionsTab, type TabProps } from "./settingsTabs.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

const TABS: [string, (props: TabProps) => ReactNode][] = [
  [t("Allmänt"), GeneralTab],
  [t("Editor"), EditorTab],
  [t("Versioner"), VersionsTab],
  [t("Synk"), SyncTab],
  [t("Hjälp"), HelpTab],
  [t("Kortkommandon"), ShortcutsTab],
  ["Om Penna", AboutTab],
];
// A phone has no keyboard to take shortcuts from.
const isShown = (label: string) => !(platform.isPhone && label === t("Kortkommandon"));

/** Where "Hjälp och kortkommandon" opens. */
export const HELP_TAB = 4;

function TabList({ tab, onPick }: { tab: number; onPick: (tab: number) => void }) {
  return (
    <nav className="settings-tabs" aria-label={t("Inställningar")}>
      {TABS.map(
        ([label], index) =>
          isShown(label) && (
            <button
              key={label}
              className={index === tab ? "settings-tab chosen" : "settings-tab"}
              aria-current={index === tab}
              onClick={() => onPick(index)}
            >
              {label}
            </button>
          ),
      )}
    </nav>
  );
}

function SettingsDialog(props: TabProps & { startTab: number; onClose: () => void }) {
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
