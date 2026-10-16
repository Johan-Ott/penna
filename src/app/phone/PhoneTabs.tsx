import type { ReactNode } from "react";
import type { AppState } from "../App.js";
import { ContentsScreen, PublishScreen, ReadScreen, SyncScreen } from "../shell/bookViews.js";
import { BookIcon, PenIcon, TreeIcon } from "../shell/icons.js";
import { PhoneBarStart, SearchButton } from "./PhoneBarStart.js";
import type { Project } from "../useProject.js";
import { usePageMap } from "../usePageMap.js";
import type { View } from "../useWritingMode.js";
import type { PhoneScreen } from "./usePhoneNavigation.js";
import { t } from "../../i18n/i18n.js";

// The phone's three places, as tabs along the bottom; Innehåll and Läs open from Boken. While
// the keyboard is up in Skriv the tabs step aside, so the text has the room.

export type Tab = "boken" | "skriv" | "publicera";

const TABS: [Tab, string, ReactNode][] = [
  ["boken", t("Boken"), <TreeIcon key="boken" />],
  ["skriv", t("Skriv"), <PenIcon key="skriv" />],
  ["publicera", t("Publicera"), <BookIcon key="publicera" />],
];

/** Which tab the screen belongs to; Innehåll, Läs and Från synken are part of Boken. */
export function tabOf(screen: PhoneScreen, view: View): Tab {
  if (screen.kind === "text" && view === "skriv") return "skriv";
  return screen.kind === "view" && view === "publicera" ? "publicera" : "boken";
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

// A bar as Boken and Skriv have one; the tabs below are the way back.
const ViewBar = (props: { app: AppState; project: Project; title: string; sub?: string }) => (
  <header className="phone-bar">
    <PhoneBarStart app={props.app} project={props.project} />
    <span className="phone-bar-title">
      <span>{props.title}</span>
      {props.sub && <span className="phone-bar-sub">{props.sub}</span>}
    </span>
    <span className="phone-bar-end">
      <SearchButton app={props.app} />
    </span>
  </header>
);

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
      {view === "innehall" && <ViewBar {...views} title={t("Innehåll")} />}
      {view === "innehall" && (
        <ContentsScreen
          app={app}
          project={project}
          pageMap={pageMap}
          onOpenScene={props.onOpenText}
        />
      )}
      {view === "las" && <ReadScreen {...views} />}
      {view === "publicera" && <ViewBar {...views} title={t("Publicera")} sub={project.name} />}
      {view === "publicera" && <PublishScreen {...views} />}
      {view === "synk" && <SyncScreen {...views} />}
    </div>
  );
}
