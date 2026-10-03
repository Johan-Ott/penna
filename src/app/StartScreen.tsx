import { useState } from "react";
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

/** Before a project is open: the onboarding the first time, then the bookshelf. */
export function StartScreen({ app }: StartScreenProps) {
  const { preferences } = app.startup;
  const [onboardingStep, setOnboardingStep] = useState(preferences.isOnboardingDone ? 0 : 1);
  const finish = (projectDir: string, libraryDir: string | null) =>
    finishOnboarding(app, projectDir, libraryDir);
  if (onboardingStep > 0) {
    return (
      <Onboarding
        knownLibraryDir={preferences.libraryDir}
        defaultDailyGoal={preferences.defaultDailyGoal}
        startStep={onboardingStep}
        onFinish={finish}
        onCancel={() => setOnboardingStep(0)}
      />
    );
  }
  return (
    <Bookshelf
      libraryDir={preferences.libraryDir}
      knownProjects={preferences.knownProjects}
      onOpen={(dir) => void app.open(dir)}
      onNewProject={() => setOnboardingStep(preferences.libraryDir ? 4 : 3)}
      onOpenFolder={() => void app.choose()}
      {...shelfHandlers(app)}
    />
  );
}
