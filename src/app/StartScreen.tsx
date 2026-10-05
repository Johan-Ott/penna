import { useState, type ReactNode } from "react";
import { useMenuButton } from "./Menu.js";
import { appMenu } from "./shell/appMenu.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { usePhone } from "./phone/usePhone.js";
import { SettingsLayer, SHORTCUTS_TAB } from "./settings/SettingsDialog.js";
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

// The example goes into the Penna folder when there is one, otherwise into Documents.
async function exampleDir(libraryDir: string | null) {
  const target = libraryDir ?? `${(await platform.knownFolders()).documents}/Penna`;
  await platform.fileSystem.makeDir(target);
  return copyExampleProject(platform.fileSystem, target);
}

// "Leta upp mappen": the writer points at where the project went, and the shelf follows.
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

function shelfHandlers(app: StartScreenProps["app"]) {
  const { preferences, updatePreferences } = app.startup;
  return {
    onOpenExample: () => void exampleDir(preferences.libraryDir).then(app.open),
    onLocate: (book: ShelfBook) => void locate(book, updatePreferences),
    onForget: (book: ShelfBook) => updatePreferences((current) => forgetProject(current, book.dir)),
  };
}

// The shelf's top bar has only the menu: new project, open a folder, settings and help.
function ShelfFrame(
  props: StartScreenProps & { onNewProject: () => void; isPhone: boolean; children: ReactNode },
) {
  const { app } = props;
  const settings = app.writingMode.settingsDialog;
  const menu = useMenuButton(
    t("Meny"),
    appMenu({
      showShelf: () => undefined,
      newProject: props.onNewProject,
      openFolder: () => void app.choose(),
      showVersions: null,
      exportZip: null,
      openSettings: () => settings.open(),
      openShortcuts: () => settings.open(SHORTCUTS_TAB),
    }),
  );
  // The phone's shelf is a screen of its own, without the top bar.
  if (props.isPhone) return <div className="phone-screen">{props.children}</div>;
  return (
    <div className="shelf-app">
      <ShelfTopbar title={t("Bokhylla")} onMenu={menu.open} />
      <div className="main-card">{props.children}</div>
      {menu.menu}
      <SettingsLayer {...app.startup} {...app.writingMode} dialog={settings} book={null} />
    </div>
  );
}

// The first time the onboarding; after Nytt projekt in a book, the new project's step.
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
        onOpenFolder={() => void app.choose()}
        {...shelfHandlers(app)}
      />
    </ShelfFrame>
  );
}

/** Before a project is open: the onboarding the first time, then the bookshelf. */
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
