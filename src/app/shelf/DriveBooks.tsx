import { useCallback, useEffect, useState } from "react";
import { joinPath } from "../../storage/fileSystem.js";
import { googleDrive } from "../../sync/googleDrive.js";
import { syncProject } from "../../sync/driveSync.js";
import { STATE_FILE } from "../../sync/syncState.js";
import { Dialog } from "../controls.js";
import { booksAsked, signIn } from "../googleAccount.js";
import { platform } from "../platform.js";
import type { PreferenceChange } from "../useStartup.js";
import { t } from "../../i18n/i18n.js";

// The books in Penna/ in the writer's Drive that this device does not have yet. A fetch that
// stopped halfway has a folder but no sync state, so it is listed again to finish.
async function booksOnDrive(libraryDir: string) {
  const signIn = platform.googleSignIn;
  if (!signIn) return [];
  const drive = googleDrive(signIn.accessToken, signIn.fetch);
  const penna = await drive.findFolder("Penna", null);
  if (!penna) return [];
  const folders = (await drive.list(penna)).filter((file) => file.isFolder);
  const synced = await Promise.all(
    folders.map((folder) =>
      platform.fileSystem.modifiedAt(joinPath(libraryDir, `${folder.name}/${STATE_FILE}`)),
    ),
  );
  return folders.filter((_folder, index) => synced[index] === null).map((folder) => folder.name);
}

type Progress = { book: number; books: number; done: number; all: number };

// Each book chosen is synced into a folder of its name, as every later sync finds it.
async function fetchBooks(libraryDir: string, names: string[], onProgress: (at: Progress) => void) {
  const signIn = platform.googleSignIn;
  if (!signIn) return [];
  const drive = googleDrive(signIn.accessToken, signIn.fetch);
  const dirs: string[] = [];
  for (const [index, name] of names.entries()) {
    const dir = joinPath(libraryDir, name);
    const step = (done: number, all: number) =>
      onProgress({ book: index + 1, books: names.length, done, all });
    await syncProject(platform.fileSystem, drive, dir, { now: Date.now(), onProgress: step });
    dirs.push(dir);
  }
  return dirs;
}

type Found = { kind: "looking" } | { kind: "books"; names: string[] } | { kind: "signIn" };

function useFound(libraryDir: string, attempt: number) {
  const [found, setFound] = useState<Found>({ kind: "looking" });
  useEffect(() => {
    setFound({ kind: "looking" });
    booksOnDrive(libraryDir)
      .then((names) => setFound({ kind: "books", names }))
      .catch(() => setFound({ kind: "signIn" }));
  }, [libraryDir, attempt]);
  return found;
}

interface Props {
  libraryDir: string;
  onOpen: (dir: string) => void;
  updatePreferences: (change: PreferenceChange) => void;
  onClose: () => void;
}

const progressText = ({ book, books, done, all }: Progress) =>
  t("Bok {book} av {books} · {done} av {all} filer", { book, books, done, all });

const label = (name: string) => name.replace(/\.penna$/, "");

function BookBoxes(props: { names: string[]; chosen: string[]; onToggle: (name: string) => void }) {
  return (
    <div className="drive-books-list">
      {props.names.map((name) => (
        <label key={name} className="drive-book">
          <input
            type="checkbox"
            checked={props.chosen.includes(name)}
            onChange={() => props.onToggle(name)}
          />
          {label(name)}
        </label>
      ))}
    </div>
  );
}

// Many books are found by a few letters of their name.
function BookChoice(props: { names: string[]; onFetch: (names: string[]) => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const shown = props.names.filter((name) =>
    label(name).toLowerCase().includes(query.toLowerCase()),
  );
  const toggle = (name: string) =>
    setChosen(chosen.includes(name) ? chosen.filter((other) => other !== name) : [...chosen, name]);
  return (
    <>
      {props.names.length > 6 && (
        <input
          className="settings-text drive-books-search"
          placeholder={t("Sök…")}
          aria-label={t("Sök bland böckerna")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <BookBoxes names={shown} chosen={chosen} onToggle={toggle} />
      <button
        className="button primary"
        disabled={!chosen.length}
        onClick={() => props.onFetch(chosen)}
      >
        {t("Hämta {count}", { count: chosen.length })}
      </button>
    </>
  );
}

// One book fetched opens; several go to the shelf, which shows them as they arrive.
function useFetch(props: Props) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const fetch = async (names: string[]) => {
    setFailure(null);
    setProgress({ book: 1, books: names.length, done: 0, all: 0 });
    try {
      const dirs = await fetchBooks(props.libraryDir, names, setProgress);
      props.onClose();
      if (dirs.length === 1 && dirs[0]) props.onOpen(dirs[0]);
    } catch (error) {
      setFailure(String(error));
    } finally {
      setProgress(null);
    }
  };
  return { progress, failure, fetch };
}

function DriveBooksBody(props: Props & { found: Found; onSignedIn: () => void }) {
  const { progress, failure, fetch } = useFetch(props);
  const { found } = props;
  const connect = () => void signIn(props.updatePreferences).then(props.onSignedIn);
  if (found.kind === "looking") return <p className="setting-hint">{t("Letar i din Drive…")}</p>;
  if (found.kind === "signIn")
    return (
      <button className="button primary" onClick={connect}>
        {t("Logga in med Google")}
      </button>
    );
  if (progress) return <p className="setting-hint">{progressText(progress)}</p>;
  return (
    <>
      {found.names.length === 0 ? (
        <p className="setting-hint">{t("Alla dina böcker i Drive finns redan här.")}</p>
      ) : (
        <BookChoice names={found.names} onFetch={(names) => void fetch(names)} />
      )}
      {failure && (
        <p className="backup-problem" role="alert">
          {t("Böckerna kunde inte hämtas klart: {reason}. Försök igen.", { reason: failure })}
        </p>
      )}
    </>
  );
}

// Opened by a sign-in, it has nothing to ask when Drive has no books this device lacks.
function DriveBooksDialog(props: Props & { isAsked: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const found = useFound(props.libraryDir, attempt);
  const isEmpty = found.kind === "books" && found.names.length === 0;
  const { isAsked, onClose } = props;
  useEffect(() => {
    if (isAsked && isEmpty) onClose();
  }, [isAsked, isEmpty, onClose]);
  return (
    <Dialog label={t("Dina böcker i Google Drive")} className="drive-books" onClose={props.onClose}>
      <DriveBooksBody
        {...props}
        found={found}
        onSignedIn={() => setAttempt((count) => count + 1)}
      />
    </Dialog>
  );
}

/** Hämta från Google Drive…: books made on another device, brought here and kept in sync. It
 * opens of itself after a sign-in. */
export function useDriveBooksDialog(
  input: Omit<Props, "onClose" | "libraryDir"> & { libraryDir: string | null },
) {
  const [isOpen, setOpen] = useState<false | "asked" | "chosen">(false);
  const isAsked = booksAsked.use();
  const { libraryDir } = input;
  const canFetch = platform.googleSignIn !== undefined && libraryDir !== null;
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!isAsked || !canFetch) return;
    booksAsked.set(false);
    setOpen("asked");
  }, [isAsked, canFetch]);
  return {
    open: canFetch ? () => setOpen("chosen") : null,
    layer: isOpen && libraryDir && (
      <DriveBooksDialog
        {...input}
        libraryDir={libraryDir}
        isAsked={isOpen === "asked"}
        onClose={close}
      />
    ),
  };
}
