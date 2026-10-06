import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { ContentsScreen, PublishScreen, ReadScreen, SyncScreen } from "../shell/bookViews.js";
import { BookIcon, ContentsIcon, PenIcon, TreeIcon } from "../shell/icons.js";
import type { Project } from "../useProject.js";
import { usePageMap } from "../usePageMap.js";
import type { View } from "../useWritingMode.js";
import type { PhoneScreen } from "./usePhoneNavigation.js";
import { t } from "../../i18n/i18n.js";

// The phone's four places, as tabs along the bottom. Writing has the whole screen, so the
// tabs hide while a text is open.

export type Tab = "boken" | "skriv" | "innehall" | "publicera";

const TABS: [Tab, string, ReactNode][] = [
  ["boken", t("Boken"), <TreeIcon key="boken" />],
  ["skriv", t("Skriv"), <PenIcon key="skriv" />],
  ["innehall", t("Innehåll"), <ContentsIcon key="innehall" />],
  ["publicera", t("Publicera"), <BookIcon key="publicera" />],
];

/** Which tab the screen belongs to; Läs is part of Innehåll, Från synken of Boken. */
export function tabOf(screen: PhoneScreen, view: View): Tab {
  if (screen.kind !== "view") return "boken";
  if (view === "las") return "innehall";
  if (view === "synk" || view === "skriv") return "boken";
  return view;
}

export function TabBar(props: { tab: Tab; onTab: (tab: Tab) => void }) {
  return (
    <nav className="phone-tabs" aria-label={t("Läge")}>
      {TABS.map(([tab, label, icon]) => (
        <button
          key={tab}
          className={tab === props.tab ? "phone-tab chosen" : "phone-tab"}
          aria-current={tab === props.tab ? "page" : undefined}
          onClick={() => props.onTab(tab)}
        >
          {icon}
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

/** Innehåll, Läs, Publicera or Från synken, as the writing mode says. */
export function ViewScreen(props: {
  app: AppState;
  project: Project;
  onBack: () => void;
  onOpenText: (id: string) => void;
}) {
  const { app, project } = props;
  const { view } = app.writingMode;
  const pageMap = usePageMap(project, app.startup.preferences.authorName, view === "innehall");
  const views = { app, project, onBack: props.onBack };
  return (
    <div className="phone-view">
      {view === "innehall" && (
        <ContentsScreen
          app={app}
          project={project}
          pageMap={pageMap}
          onOpenScene={props.onOpenText}
        />
      )}
      {view === "las" && <ReadScreen {...views} />}
      {view === "publicera" && <PublishScreen {...views} />}
      {view === "synk" && <SyncScreen {...views} />}
    </div>
  );
}
