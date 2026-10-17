import type { AppState } from "./App.js";
import { signIn } from "./googleAccount.js";
import { useFeedbackDialog } from "./feedback/FeedbackDialog.js";
import { useBackupsDialog } from "./backups/BackupsDialog.js";
import { useState, type ReactNode } from "react";
import { useMenuButton } from "@llkit/Menu.js";
import { useCommandKey } from "./shortcuts.js";
import { appMenu, phoneShelfMenu } from "./shell/appMenu.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { PhoneShelf } from "./shelf/PhoneShelf.js";
import { ProfileButton, ProfileLayer } from "./profile/ProfileLayer.js";
import { usePhone } from "./phone/usePhone.js";
import { SettingsLayer, HELP_TAB } from "./settings/SettingsDialog.js";
import type { useWritingMode } from "./useWritingMode.js";
import { t } from "../i18n/i18n.js";
import { recordFailure } from "@llkit/errorLog.js";
import { platform } from "./platform.js";
import type { ProjectDetails } from "../project/newProject.js";
import { exampleBook, importedBook, libraryOf, newBook, startDetails } from "./onboarding/books.js";
import { NewBookDialog } from "./onboarding/NewBookDialog.js";
import { Welcome } from "./onboarding/Welcome.js";
import type { Choices } from "./onboarding/FirstChoices.js";
import { Bookshelf } from "./shelf/Bookshelf.js";
import { useCloudBooks } from "./shelf/useCloudBooks.js";
import { shelfHandlers } from "./shelf/shelfHandlers.js";

// Penna starts at the welcome the first time, and at the shelf after: every book is begun,
// fetched or opened from there.

type App = Pick<AppState, "profile" | "journey" | "updateFields" | "startup"> & {
  open: (dir: string) => Promise<void>;
  choose: () => Promise<void>;
  writingMode: ReturnType<typeof useWritingMode>;
  /** Ny bok was chosen in an open book: the shelf opens with the new book's sheet. */
  newProjectAsked: { current: boolean };
};
type StartScreenProps = { app: App };

// Each way a book reaches the shelf, opened as soon as it is there.
function bookActions(app: App) {
  const { preferences } = app.startup;
  const goal = preferences.defaultDailyGoal;
  const library = () => libraryOf(preferences.libraryDir);
  const opened = async (made: Promise<string | null>, what: string) => {
    const dir = await made.catch(recordFailure(what));
    if (dir) await app.open(dir);
  };
  return {
    create: (details: ProjectDetails) =>
      opened(
        library().then((dir) => newBook(dir, details)),
        "Boken kunde inte skapas",
      ),
    import: () =>
      void opened(
        library().then((dir) => importedBook(dir, goal)),
        "Importen",
      ),
    example: () => void opened(library().then(exampleBook), "Exempelboken"),
  };
}

// The shelf's menu, with the dialogs it opens.
function useShelfMenu(app: App, onNewProject: () => void, isPhone: boolean) {
  const settings = app.writingMode.settingsDialog;
  const backups = useBackupsDialog(app, []);
  const feedback = useFeedbackDialog();
  const actions = {
    showShelf: () => undefined,
    newProject: onNewProject,
    openFolder: () => void app.choose(),
    ...{ showVersions: null, exportZip: null, importRevision: null, book: [], sharing: [] },
    showBackups: backups.open,
    sendFeedback: feedback.open,
    openSettings: () => settings.open(),
    openShortcuts: () => settings.open(HELP_TAB),
  };
  useCommandKey("newBook", onNewProject);
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

function useNewBookSheet(app: App) {
  return useState(() => {
    const isAsked = app.newProjectAsked.current;
    app.newProjectAsked.current = false;
    return isAsked;
  });
}

// A book in Drive is fetched and opened by the tap on its cover.
function useCloud(app: App) {
  const { preferences } = app.startup;
  const cloud = useCloudBooks(preferences.libraryDir, preferences.isDriveSyncOn);
  const fetchAndOpen = async (name: string) => {
    const dir = await cloud.fetch(name).catch(recordFailure("Hämtningen"));
    if (dir) await app.open(dir);
  };
  return { ...cloud, onFetch: (name: string) => void fetchAndOpen(name) };
}

function Shelf({ app }: StartScreenProps) {
  const { preferences } = app.startup;
  const isPhone = usePhone();
  const [isNewBookOpen, setNewBookOpen] = useNewBookSheet(app);
  const books = bookActions(app);
  const cloud = useCloud(app);
  return (
    <ShelfFrame app={app} onNewProject={() => setNewBookOpen(true)} isPhone={isPhone}>
      <Bookshelf
        libraryDir={preferences.libraryDir}
        knownProjects={preferences.knownProjects}
        author={preferences.authorName}
        onOpen={(dir) => void app.open(dir)}
        onNewProject={() => setNewBookOpen(true)}
        onImport={books.import}
        onOpenExample={books.example}
        cloud={cloud}
        {...shelfHandlers(app.startup, isPhone, cloud.look)}
      />
      {isNewBookOpen && (
        <NewBookDialog
          start={startDetails(preferences.defaultDailyGoal, preferences.bookLanguage)}
          libraryDir={preferences.libraryDir ?? ""}
          onCreate={books.create}
          onClose={() => setNewBookOpen(false)}
        />
      )}
    </ShelfFrame>
  );
}

// The chosen languages' dictionaries and Typst's compiler, fetched while the writer begins; what
// fails here is fetched again the first time it is needed.
function fetchWhatPennaNeeds(languages: string[]) {
  const failed = recordFailure("Hämtningen vid första start");
  for (const language of languages) void platform.spelling?.prepare(language).catch(failed);
  void platform.prepareTypst?.().catch(failed);
}

export function StartScreen({ app }: StartScreenProps) {
  const { preferences, updatePreferences } = app.startup;
  if (preferences.isOnboardingDone) return <Shelf app={app} />;
  const start = async (withGoogle: boolean, choices: Choices) => {
    const libraryDir = await libraryOf(preferences.libraryDir);
    if (withGoogle) await signIn(updatePreferences);
    const [bookLanguage = "sv-SE"] = choices.languages;
    const { dailyGoal, authorName } = choices;
    updatePreferences((now) => ({
      ...now,
      ...{ isOnboardingDone: true, libraryDir, bookLanguage, defaultDailyGoal: dailyGoal },
      ...(authorName ? { authorName } : {}),
    }));
    fetchWhatPennaNeeds(choices.languages);
  };
  const { settings, onChangeSettings } = app.writingMode;
  return (
    <Welcome
      onStart={start}
      theme={settings.theme}
      onTheme={(theme) => onChangeSettings((current) => ({ ...current, theme }))}
    />
  );
}
