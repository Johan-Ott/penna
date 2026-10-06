import { daysBetween, projectGoals } from "../../project/progress.js";
import { dayKey } from "../../project/stats.js";
import { sceneIdsIn, sortsOf } from "../../project/tree.js";
import { chapterOf, nodeLabel } from "../../project/treeLabels.js";
import type { AppState } from "../App.js";
import { useMenuButton, type MenuItem } from "../Menu.js";
import { sidebarProps } from "../paneProps.js";
import { MenuIcon, SearchIcon } from "../shell/icons.js";
import { useMenuDialogs } from "../shell/useAppMenu.js";
import { SyncNotices } from "../SyncLayer.js";
import { TreeView } from "../tree/TreeView.js";
import type { Project } from "../useProject.js";
import { numberLocale, t } from "../../i18n/i18n.js";

interface PhoneBookProps {
  app: AppState;
  project: Project;
  onOpenText: (id: string) => void;
  onContinue: () => void;
  onSort: (sortId: string) => void;
  onSync: () => void;
}

const format = (words: number) => words.toLocaleString(numberLocale());

function TodayCard({ app, project }: Pick<PhoneBookProps, "app" | "project">) {
  const { today } = app;
  const { deadline } = projectGoals(project.fields);
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : 0;
  const daysLeft = deadline ? Math.max(0, daysBetween(dayKey(Date.now()), deadline)) : null;
  const facts = [
    t("{days} dagar i rad", { days: today.streak }),
    ...(daysLeft === null ? [] : [t("{days} dagar till deadline", { days: daysLeft })]),
  ];
  return (
    <button className="phone-today" onClick={() => app.writingMode.setProgressOpen(true)}>
      <span className="phone-today-words">
        {today.goal
          ? t("{words} / {goal} ord idag", { words: format(today.words), goal: format(today.goal) })
          : t("{count} ord idag", { count: format(today.words) })}
      </span>
      {today.goal && (
        <span className="day-progress-bar wide">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
      <span className="phone-today-facts">{facts.join(" · ")}</span>
    </button>
  );
}

function ContinueButton({ app, project, onContinue }: PhoneBookProps) {
  const scene = app.scene;
  const chapter = scene ? chapterOf(project.tree, scene.id) : null;
  const where = scene ? [chapter && `${chapter.number}. ${chapter.title}`, scene.title] : [];
  return (
    <button className="phone-continue" onClick={onContinue}>
      <span className="phone-continue-text">
        <span>{t("Fortsätt skriva")}</span>
        <span className="phone-continue-where">{where.filter(Boolean).join(" · ")}</span>
      </span>
      <span aria-hidden="true">→</span>
    </button>
  );
}

function NoteTiles({ app, onSort }: Pick<PhoneBookProps, "app" | "onSort">) {
  const sorts = app.homes.flatMap((home) =>
    sortsOf(home.tree).map((sort) => ({
      home,
      sort,
      count: sceneIdsIn(home.tree, sort.id).length,
    })),
  );
  const shown = sorts.filter(({ home, count }) => count > 0 || home === app.homes[0]);
  return (
    <div className="phone-tiles">
      {shown.map(({ home, sort, count }) => (
        <button
          key={`${home.dir}/${sort.id}`}
          className="phone-tile"
          onClick={() => onSort(sort.id)}
        >
          <span>{nodeLabel(sort, home.tree, home.summaries)}</span>
          <span className="phone-tile-count">{count}</span>
        </button>
      ))}
    </div>
  );
}

// A phone has no keyboard shortcuts or folders to pick, so the menu is short.
function phoneMenu(app: AppState, dialogs: ReturnType<typeof useMenuDialogs>): MenuItem[] {
  return [
    { label: t("Bokhylla"), onSelect: () => void app.showShelf() },
    ...(app.scene
      ? [
          {
            label: t("Versioner av den här texten"),
            onSelect: () => app.snapshots.show(app.scene?.id ?? ""),
          },
        ]
      : []),
    { label: t("Läs in redaktörens Word-fil…"), onSelect: dialogs.revision.open },
    { label: t("Serie…"), onSelect: dialogs.series.open },
    { label: t("Exportera allt som zip"), separatorBefore: true, onSelect: app.zip.backup },
    ...(dialogs.backups.open
      ? [{ label: t("Säkerhetskopior…"), onSelect: dialogs.backups.open }]
      : []),
    {
      label: t("Inställningar"),
      separatorBefore: true,
      onSelect: () => app.writingMode.settingsDialog.open(),
    },
    { label: t("Skicka feedback…"), onSelect: dialogs.feedback.open },
  ];
}

function PhoneBookHeader({ app, project }: Pick<PhoneBookProps, "app" | "project">) {
  const dialogs = useMenuDialogs({ app, project });
  const menu = useMenuButton(t("Meny"), phoneMenu(app, dialogs));
  return (
    <header className="phone-bar">
      <button className="topbar-button" aria-label={t("Meny")} onClick={menu.open}>
        <MenuIcon />
      </button>
      <span className="phone-bar-title prose">{project.name}</span>
      <button className="topbar-button" aria-label={t("Sök")} onClick={app.palette.open}>
        <SearchIcon />
      </button>
      {menu.menu}
      {dialogs.layers}
    </header>
  );
}

export function PhoneBook(props: PhoneBookProps) {
  const { app, project } = props;
  return (
    <div className="phone-screen">
      <PhoneBookHeader app={app} project={project} />
      <main className="phone-card">
        <SyncNotices
          project={project}
          reviewCount={app.syncReview.items.length}
          onShowReview={props.onSync}
        />
        <TodayCard app={app} project={project} />
        <ContinueButton {...props} />
        <TreeView {...sidebarProps(app, project)} onOpenScene={props.onOpenText} isBookOnly />
        <div className="sidebar-heading">{t("Anteckningar")}</div>
        <NoteTiles app={app} onSort={props.onSort} />
      </main>
    </div>
  );
}
