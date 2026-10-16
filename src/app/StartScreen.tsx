import type { AppState } from "./App.js";
import { signIn } from "./googleAccount.js";
import { useFeedbackDialog } from "./feedback/FeedbackDialog.js";
import { useBackupsDialog } from "./backups/BackupsDialog.js";
import { useState, type ReactNode } from "react";
import { useMenuButton } from "./Menu.js";
import { appMenu, phoneShelfMenu } from "./shell/appMenu.js";
import { ShelfTopbar } from "./shell/Topbar.js";
import { PhoneShelf } from "./shelf/PhoneShelf.js";
import { ProfileButton, ProfileLayer } from "./profile/ProfileLayer.js";
import { usePhone } from "./phone/usePhone.js";
import { SettingsLayer, HELP_TAB } from "./settings/SettingsDialog.js";
import type { useWritingMode } from "./useWritingMode.js";
import { t } from "../i18n/i18n.js";
import type { ShelfBook } from "../project/shelf.js";
import { forgetProject } from "./appPreferences.js";
import { recordFailure } from "./errorLog.js";
import { exampleBook, importedBook, libraryOf, newBook } from "./onboarding/books.js";
import { NewBookDialog } from "./onboarding/NewBookDialog.js";
import { Welcome } from "./onboarding/Welcome.js";
import { platform } from "./platform.js";
import { Bookshelf } from "./shelf/Bookshelf.js";
import { useCloudBooks } from "./shelf/useCloudBooks.js";
import type { PreferenceChange } from "./useStartup.js";

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

async function locate(book: ShelfBook, update: (change: PreferenceChange) => void) {
  const found = await platform.pickFolder();
  if (!found || !(await platform.fileSystem.list(found)).includes("project.json")) return;
  update((current) => ({
    ...current,
    knownProjects: current.knownProjects.map((dir) => (dir === book.dir ? found : dir)),
  }));
}

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
    create: (title: string, type: string) =>
      opened(
        library().then((dir) => newBook(dir, title, type, goal)),
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

function shelfHandlers(app: App, isPhone: boolean) {
  const { updatePreferences } = app.startup;
  return {
    onLocate: isPhone ? null : (book: ShelfBook) => void locate(book, updatePreferences),
    onForget: (book: ShelfBook) => updatePreferences((current) => forgetProject(current, book.dir)),
    onRemove: (book: ShelfBook) =>
      void platform.removeBook?.(book.dir, book.title).then((isRemoved) => {
        if (isRemoved) updatePreferences((current) => forgetProject(current, book.dir));
      }),
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
        {...shelfHandlers(app, isPhone)}
      />
      {isNewBookOpen && (
        <NewBookDialog onCreate={books.create} onClose={() => setNewBookOpen(false)} />
      )}
    </ShelfFrame>
  );
}

export function StartScreen({ app }: StartScreenProps) {
  const { preferences, updatePreferences } = app.startup;
  if (preferences.isOnboardingDone) return <Shelf app={app} />;
  const start = async (withGoogle: boolean) => {
    const libraryDir = await libraryOf(preferences.libraryDir);
    if (withGoogle) await signIn(updatePreferences);
    updatePreferences((now) => ({ ...now, isOnboardingDone: true, libraryDir }));
  };
  return <Welcome onStart={start} />;
}
