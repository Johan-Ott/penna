import { useFeedbackDialog } from "./feedback/FeedbackDialog.js";
import { useBackupsDialog } from "./backups/BackupsDialog.js";
import { useState, type MouseEvent, type ReactNode } from "react";
import { useMenuButton, type MenuItem } from "./Menu.js";
import { appMenu, type AppMenuActions } from "./shell/appMenu.js";
import { MenuIcon } from "./shell/icons.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { usePhone } from "./phone/usePhone.js";
import { SettingsLayer, HELP_TAB } from "./settings/SettingsDialog.js";
import type { useWritingMode } from "./useWritingMode.js";
import { t } from "../i18n/i18n.js";
import { copyExampleProject } from "../project/newProject.js";
import type { ShelfBook } from "../project/shelf.js";
import { forgetProject, type AppPreferences } from "./appPreferences.js";
import { Onboarding } from "./onboarding/Onboarding.js";
import { platform } from "./platform.js";
import { Bookshelf } from "./shelf/Bookshelf.js";
import type { PreferenceChange } from "./useStartup.js";

interface StartScreenProps {
  app: {
    open: (dir: string) => Promise<void>;
    choose: () => Promise<void>;
    startup: { preferences: AppPreferences; updatePreferences: (change: PreferenceChange) => void };
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
  ...(actions.showBackups ? [{ label: t("Säkerhetskopior…"), onSelect: actions.showBackups }] : []),
  { label: t("Inställningar"), separatorBefore: true, onSelect: actions.openSettings },
  { label: t("Hjälp"), onSelect: actions.openShortcuts },
  { label: t("Skicka feedback…"), onSelect: actions.sendFeedback },
];

// The shelf's menu, with the dialogs it opens.
function useShelfMenu(app: StartScreenProps["app"], onNewProject: () => void, isPhone: boolean) {
  const settings = app.writingMode.settingsDialog;
  const backups = useBackupsDialog(app, []);
  const feedback = useFeedbackDialog();
  const actions = {
    showShelf: () => undefined,
    newProject: onNewProject,
    openFolder: () => void app.choose(),
    showVersions: null,
    exportZip: null,
    importRevision: null,
    sharing: [],
    showBackups: backups.open,
    sendFeedback: feedback.open,
    openSettings: () => settings.open(),
    openShortcuts: () => settings.open(HELP_TAB),
  };
  const menu = useMenuButton(t("Meny"), isPhone ? phoneShelfMenu(actions) : appMenu(actions));
  const layers = (
    <>
      {menu.menu}
      {backups.layer}
      {feedback.layer}
      <SettingsLayer {...app.startup} {...app.writingMode} dialog={settings} book={null} />
    </>
  );
  return { open: menu.open, layers };
}

const PhoneShelf = (props: {
  onMenu: (event: MouseEvent<HTMLElement>) => void;
  children: ReactNode;
}) => (
  <div className="phone-screen">
    <header className="phone-bar">
      <button className="topbar-button" aria-label={t("Meny")} onClick={props.onMenu}>
        <MenuIcon />
      </button>
    </header>
    {props.children}
  </div>
);

function ShelfFrame(
  props: StartScreenProps & { onNewProject: () => void; isPhone: boolean; children: ReactNode },
) {
  const { app } = props;
  const menu = useShelfMenu(app, props.onNewProject, props.isPhone);
  const { layers } = menu;
  if (props.isPhone)
    return (
      <PhoneShelf onMenu={menu.open}>
        {props.children}
        {layers}
      </PhoneShelf>
    );
  return (
    <div className="shelf-app">
      <ShelfTopbar title={t("Bokhylla")} onMenu={menu.open} />
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
