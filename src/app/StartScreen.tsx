import type { AppState } from "./App.js";
import { useDriveBooksDialog } from "./shelf/DriveBooks.js";
import { useFeedbackDialog } from "./feedback/FeedbackDialog.js";
import { useBackupsDialog } from "./backups/BackupsDialog.js";
import { useState, type ReactNode } from "react";
import { useMenuButton, type MenuItem } from "./Menu.js";
import { appMenu, type AppMenuActions } from "./shell/appMenu.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { PhoneShelf } from "./shelf/PhoneShelf.js";
import { ProfileButton, ProfileLayer } from "./profile/ProfileLayer.js";
import { usePhone } from "./phone/usePhone.js";
import { SettingsLayer, HELP_TAB } from "./settings/SettingsDialog.js";
import type { useWritingMode } from "./useWritingMode.js";
import { checkForUpdates } from "./updates.js";
import { t } from "../i18n/i18n.js";
import { copyExampleProject } from "../project/newProject.js";
import type { ShelfBook } from "../project/shelf.js";
import { forgetProject } from "./appPreferences.js";
import { Onboarding } from "./onboarding/Onboarding.js";
import { platform } from "./platform.js";
import { Bookshelf } from "./shelf/Bookshelf.js";
import type { PreferenceChange } from "./useStartup.js";

interface StartScreenProps {
  app: Pick<AppState, "profile" | "journey" | "updateFields" | "startup"> & {
    open: (dir: string) => Promise<void>;
    choose: () => Promise<void>;
    writingMode: ReturnType<typeof useWritingMode>;
    /** Nytt projekt was chosen in an open book: the shelf starts on the new project's step. */
    newProjectAsked: { current: boolean };
  };
}

async function exampleDir(libraryDir: string | null) {
  const target = libraryDir ?? `${(await platform.knownFolders()).documents}/Penna`;
  await platform.fileSystem.makeDir(target);
  return copyExampleProject(platform.fileSystem, target);
}

async function locate(book: ShelfBook, update: (change: PreferenceChange) => void) {
  const found = await platform.pickFolder();
  if (!found || !(await platform.fileSystem.list(found)).includes("project.json")) return;
  update((current) => ({
    ...current,
    knownProjects: current.knownProjects.map((dir) => (dir === book.dir ? found : dir)),
  }));
}

function finishOnboarding(
  app: StartScreenProps["app"],
  projectDir: string,
  libraryDir: string | null,
) {
  app.startup.updatePreferences((current) => ({
    ...current,
    isOnboardingDone: true,
    libraryDir: libraryDir ?? current.libraryDir,
  }));
  void app.open(projectDir);
}

function shelfHandlers(app: StartScreenProps["app"], isPhone: boolean) {
  const { preferences, updatePreferences } = app.startup;
  return {
    onOpenExample: () => void exampleDir(preferences.libraryDir).then(app.open),
    onOpenFolder: isPhone ? null : () => void app.choose(),
    onLocate: isPhone ? null : (book: ShelfBook) => void locate(book, updatePreferences),
    onForget: (book: ShelfBook) => updatePreferences((current) => forgetProject(current, book.dir)),
    onRemove: (book: ShelfBook) =>
      void platform.removeBook?.(book.dir, book.title).then((isRemoved) => {
        if (isRemoved) updatePreferences((current) => forgetProject(current, book.dir));
      }),
  };
}

// A phone has no folders to pick and no shortcuts, so its menu is short.
const phoneShelfMenu = (actions: AppMenuActions): MenuItem[] => [
  { label: t("Nytt projekt"), onSelect: actions.newProject },
  ...(actions.fetchFromDrive
    ? [{ label: t("Hämta från Google Drive…"), onSelect: actions.fetchFromDrive }]
    : []),
  ...(actions.showBackups ? [{ label: t("Säkerhetskopior…"), onSelect: actions.showBackups }] : []),
  { label: t("Inställningar"), separatorBefore: true, onSelect: actions.openSettings },
  { label: t("Hjälp"), onSelect: actions.openShortcuts },
  { label: t("Skicka feedback…"), onSelect: actions.sendFeedback },
  { label: t("Sök efter uppdateringar…"), onSelect: () => void checkForUpdates(true) },
];

// A book fetched from Drive keeps syncing, so signing in for it turns the sync on.
const useShelfDrive = (app: StartScreenProps["app"]) =>
  useDriveBooksDialog({
    libraryDir: app.startup.preferences.libraryDir,
    onOpen: (dir) => void app.open(dir),
    onSignedIn: () => app.startup.updatePreferences((now) => ({ ...now, isDriveSyncOn: true })),
  });

// The shelf's menu, with the dialogs it opens.
function useShelfMenu(app: StartScreenProps["app"], onNewProject: () => void, isPhone: boolean) {
  const settings = app.writingMode.settingsDialog;
  const backups = useBackupsDialog(app, []);
  const feedback = useFeedbackDialog();
  const drive = useShelfDrive(app);
  const actions = {
    showShelf: () => undefined,
    newProject: onNewProject,
    openFolder: () => void app.choose(),
    fetchFromDrive: drive.open,
    ...{ showVersions: null, exportZip: null, importRevision: null, openTheme: null, sharing: [] },
    showBackups: backups.open,
    sendFeedback: feedback.open,
    openSettings: () => settings.open(),
    openShortcuts: () => settings.open(HELP_TAB),
  };
  const menu = useMenuButton(t("Meny"), isPhone ? phoneShelfMenu(actions) : appMenu(actions));
  const layers = (
    <>
      {menu.menu}
      {drive.layer}
      {backups.layer}
      {feedback.layer}
      <SettingsLayer {...app.startup} {...app.writingMode} dialog={settings} book={null} />
    </>
  );
  return { open: menu.open, layers };
}

function ShelfFrame(
  props: StartScreenProps & { onNewProject: () => void; isPhone: boolean; children: ReactNode },
) {
  const { app } = props;
  const menu = useShelfMenu(app, props.onNewProject, props.isPhone);
  const layers = (
    <>
      {menu.layers}
      <ProfileLayer app={app} project={null} />
    </>
  );
  const profile = <ProfileButton app={app} />;
  if (props.isPhone)
    return (
      <PhoneShelf onMenu={menu.open} profile={profile}>
        {props.children}
        {layers}
      </PhoneShelf>
    );
  return (
    <div className="shelf-app">
      <ShelfTopbar title={t("Bokhylla")} onMenu={menu.open} profile={profile} />
      <div className="main-card">{props.children}</div>
      {layers}
    </div>
  );
}

function useOnboardingStep(app: StartScreenProps["app"], projectStep: number) {
  return useState(() => {
    if (!app.startup.preferences.isOnboardingDone) return 1;
    const isAsked = app.newProjectAsked.current;
    app.newProjectAsked.current = false;
    return isAsked ? projectStep : 0;
  });
}

function Shelf(props: StartScreenProps & { onNewProject: () => void }) {
  const { app } = props;
  const { preferences } = app.startup;
  const isPhone = usePhone();
  return (
    <ShelfFrame app={app} onNewProject={props.onNewProject} isPhone={isPhone}>
      <Bookshelf
        isPhone={isPhone}
        libraryDir={preferences.libraryDir}
        knownProjects={preferences.knownProjects}
        onOpen={(dir) => void app.open(dir)}
        onNewProject={props.onNewProject}
        {...shelfHandlers(app, isPhone)}
      />
    </ShelfFrame>
  );
}

export function StartScreen({ app }: StartScreenProps) {
  const { preferences } = app.startup;
  const projectStep = preferences.libraryDir ? 4 : 3;
  const [onboardingStep, setOnboardingStep] = useOnboardingStep(app, projectStep);
  if (onboardingStep > 0) {
    return (
      <Onboarding
        knownLibraryDir={preferences.libraryDir}
        defaultDailyGoal={preferences.defaultDailyGoal}
        startStep={onboardingStep}
        onFinish={(projectDir, libraryDir) => finishOnboarding(app, projectDir, libraryDir)}
        onCancel={() => setOnboardingStep(0)}
      />
    );
  }
  return <Shelf app={app} onNewProject={() => setOnboardingStep(projectStep)} />;
}
