import {
  averagePerDay,
  daysBetween,
  finishDay,
  projectGoals,
  shortDay,
} from "../../project/progress.js";
import { dayKey } from "../../project/stats.js";
import { sceneIdsIn, sortsOf } from "../../project/tree.js";
import { chapterOf, manuscriptWords, nodeLabel } from "../../project/treeLabels.js";
import { requestStudio } from "../studio/studioRequest.js";
import { BookRhythm } from "./BookRhythm.js";
import type { AppState } from "../App.js";
import { useMenuButton, type MenuItem } from "../Menu.js";
import { sidebarProps } from "../paneProps.js";
import { MenuIcon, SearchIcon } from "../shell/icons.js";
import { useMenuDialogs } from "../shell/useAppMenu.js";
import { HELP_TAB } from "../settings/SettingsDialog.js";
import { SyncNotices } from "../SyncLayer.js";
import { collaborationItems } from "../exporting/collaboration.js";
import { TreeView } from "../tree/TreeView.js";
import { useTemplatesDialog, useThemeDialog } from "../Sidebar.js";
import type { Project } from "../useProject.js";
import { checkForUpdates } from "../updates.js";
import { numberLocale, t } from "../../i18n/i18n.js";

interface PhoneBookProps {
  app: AppState;
  project: Project;
  onOpenText: (id: string) => void;
  onContinue: () => void;
  onSort: (sortId: string) => void;
  /** The scene Fortsätt skriva opens. */
  continueId: string | null;
  onSync: () => void;
}

const format = (words: number) => words.toLocaleString(numberLocale());

function todayFacts(app: AppState, project: Project) {
  const today = dayKey(Date.now());
  const { deadline, totalGoal } = projectGoals(project.fields);
  const daysLeft = deadline ? Math.max(0, daysBetween(today, deadline)) : null;
  const words = manuscriptWords(project.tree, project.summaries);
  const finish = finishDay(words, totalGoal, averagePerDay(app.stats, today), today);
  const { streak } = app.today;
  return [
    streak === 1 ? t("1 dag i rad") : t("{days} dagar i rad", { days: streak }),
    finish && t("klart runt {day} i din takt", { day: shortDay(finish) }),
    daysLeft === 1 && t("1 dag till deadline"),
    daysLeft !== null && daysLeft !== 1 && t("{days} dagar till deadline", { days: daysLeft }),
  ].filter(Boolean);
}

// The day's words open Insikter; Dela opens the week as a picture in Studio.
function TodayCard({ app, project }: Pick<PhoneBookProps, "app" | "project">) {
  const { today } = app;
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : 0;
  const shareWeek = () => (requestStudio("vecka"), app.writingMode.setView("publicera"));
  return (
    <div className="phone-today">
      <span className="phone-today-head">
        <button className="phone-today-words" onClick={() => app.writingMode.setProgressOpen(true)}>
          {today.goal
            ? t("{words} / {goal} ord idag", {
                words: format(today.words),
                goal: format(today.goal),
              })
            : t("{count} ord idag", { count: format(today.words) })}
        </button>
        <button className="link-button quiet" onClick={shareWeek}>
          {t("Dela")}
        </button>
      </span>
      {today.goal && (
        <span className="day-progress-bar wide">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
      <span className="phone-today-facts">{todayFacts(app, project).join(" · ")}</span>
      <BookRhythm project={project} />
    </div>
  );
}

// The book's text she was last in, not a note she looked at since.
function ContinueButton({ project, continueId, onContinue }: PhoneBookProps) {
  const chapter = continueId ? chapterOf(project.tree, continueId) : null;
  const title = continueId ? project.summaries[continueId]?.title : null;
  const where = [chapter && `${chapter.number}. ${chapter.title}`, title];
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
const versionsItem = (app: AppState): MenuItem[] => {
  const sceneId = app.scene?.id;
  return sceneId
    ? [{ label: t("Versioner av den här texten"), onSelect: () => app.snapshots.show(sceneId) }]
    : [];
};

type BookDialogs = Record<"theme" | "templates", { open: () => void }>;

function phoneMenu(
  app: AppState,
  dialogs: ReturnType<typeof useMenuDialogs>,
  book: BookDialogs,
): MenuItem[] {
  return [
    { label: t("Bokhylla"), onSelect: () => void app.showShelf() },
    { label: t("Profil"), onSelect: app.profile.open },
    { label: t("Tema…"), onSelect: book.theme.open },
    { label: t("Mallar och bitar…"), onSelect: book.templates.open },
    ...versionsItem(app),
    ...(app.project ? collaborationItems(app.project, app.zip.run) : []),
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
    { label: t("Hjälp"), onSelect: () => app.writingMode.settingsDialog.open(HELP_TAB) },
    { label: t("Skicka feedback…"), onSelect: dialogs.feedback.open },
    { label: t("Sök efter uppdateringar…"), onSelect: () => void checkForUpdates(true) },
  ];
}

function PhoneBookHeader({ app, project }: Pick<PhoneBookProps, "app" | "project">) {
  const dialogs = useMenuDialogs({ app, project });
  const bookProps = sidebarProps(app, project);
  const theme = useThemeDialog(bookProps);
  const templates = useTemplatesDialog(bookProps);
  const menu = useMenuButton(t("Meny"), phoneMenu(app, dialogs, { theme, templates }));
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
      {theme.dialog}
      {templates.dialog}
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
