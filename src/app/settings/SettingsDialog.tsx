import { CloseButton } from "@llkit/controls.js";
import { fold } from "../palette/paletteSearch.js";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useEscape } from "@llkit/keys.js";
import { useCommandKey } from "../shortcuts.js";
import { AboutTab } from "./infoTabs.js";
import { ShortcutsTab } from "./shortcutsTab.js";
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
  [t("Konto"), SyncTab],
  [t("Hjälp"), HelpTab],
  [t("Kortkommandon"), ShortcutsTab],
  [t("Om Penna"), AboutTab],
];
// A phone has no keyboard to take shortcuts from.
const isShown = (label: string) => !(platform.isPhone && label === t("Kortkommandon"));

// The tabs that hold settings, searched together; Hjälp and Om Penna are reading, not settings.
const SEARCHED = TABS.slice(0, 4);

// Every settings tab is drawn, and the rows whose words do not hold the search are hidden.
function Found(props: TabProps & { query: string }) {
  const list = useRef<HTMLDivElement>(null);
  const [isEmpty, setEmpty] = useState(false);
  useLayoutEffect(() => {
    const wanted = fold(props.query.trim());
    const sections = Array.from(list.current?.querySelectorAll<HTMLElement>("section") ?? []);
    for (const section of sections) {
      const rows = Array.from(section.querySelectorAll<HTMLElement>(".settings-row"));
      rows.forEach((row) => (row.hidden = !fold(row.textContent ?? "").includes(wanted)));
      section.hidden = rows.every((row) => row.hidden);
    }
    setEmpty(sections.every((section) => section.hidden));
  });
  return (
    <div ref={list} className="settings-found">
      {SEARCHED.map(([label, Tab]) => (
        <section key={label}>
          <h2 className="settings-found-heading">{label}</h2>
          <Tab {...props} />
        </section>
      ))}
      {isEmpty && <p className="setting-hint">{t("Ingen inställning matchar.")}</p>}
    </div>
  );
}

/** Where "Hjälp och kortkommandon" opens. */
export const HELP_TAB = 4;

const SearchField = (props: { query: string; onQuery: (query: string) => void }) => (
  <input
    className="settings-text settings-search"
    type="search"
    aria-label={t("Sök i inställningarna")}
    placeholder={t("Sök…")}
    value={props.query}
    onChange={(event) => props.onQuery(event.target.value)}
  />
);

function TabList(props: {
  tab: number;
  onPick: (tab: number) => void;
  query: string;
  onQuery: (query: string) => void;
}) {
  const { tab, onPick } = props;
  return (
    <nav className="settings-tabs" aria-label={t("Inställningar")}>
      <SearchField query={props.query} onQuery={props.onQuery} />
      {TABS.map(
        ([label], index) =>
          isShown(label) && (
            <button
              key={label}
              className={index === tab && !props.query ? "settings-tab chosen" : "settings-tab"}
              aria-current={index === tab}
              onClick={() => (props.onQuery(""), onPick(index))}
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
  const [query, setQuery] = useState("");
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
        <TabList tab={tab} onPick={setTab} query={query} onQuery={setQuery} />
        <div className="settings-content">
          <div className="settings-heading">
            <h1>{query ? t("Sökresultat") : title}</h1>
            <CloseButton onClose={props.onClose} />
          </div>
          {query ? <Found {...props} query={query} /> : <Content {...props} />}
        </div>
      </div>
    </div>
  );
}

export function useSettingsDialog() {
  const [openTab, setOpenTab] = useState<number | null>(null);
  useCommandKey("settings", () => setOpenTab(0));
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
