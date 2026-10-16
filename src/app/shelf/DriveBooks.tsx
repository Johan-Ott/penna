import { useEffect, useState } from "react";
import { joinPath } from "../../storage/fileSystem.js";
import { googleDrive } from "../../sync/googleDrive.js";
import { syncProject } from "../../sync/driveSync.js";
import { STATE_FILE } from "../../sync/syncState.js";
import { Dialog } from "../controls.js";
import { platform } from "../platform.js";
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

type Progress = { name: string; done: number; all: number };

// A book fetched is synced into an empty folder of the same name, as every sync finds it.
async function fetchBook(libraryDir: string, name: string, onProgress: (step: Progress) => void) {
  const signIn = platform.googleSignIn;
  if (!signIn) return null;
  const dir = joinPath(libraryDir, name);
  await syncProject(platform.fileSystem, googleDrive(signIn.accessToken, signIn.fetch), dir, {
    now: Date.now(),
    onProgress: (done, all) => onProgress({ name, done, all }),
  });
  return dir;
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
  onSignedIn: () => void;
  onClose: () => void;
}

const stepText = (progress: Progress) =>
  progress.all === 0
    ? t("Hämtar…")
    : t("Hämtar {done} av {all} filer…", { done: progress.done, all: progress.all });

function BookList(props: {
  names: string[];
  fetching: Progress | null;
  onTake: (name: string) => void;
}) {
  if (props.names.length === 0)
    return (
      <p className="setting-hint">{t("Alla böcker i Penna-mappen i din Drive finns redan här.")}</p>
    );
  return props.names.map((name) => (
    <button
      key={name}
      className="studio-link"
      disabled={props.fetching !== null}
      onClick={() => props.onTake(name)}
    >
      <span className="studio-item-name">{name.replace(/\.penna$/, "")}</span>
      <span className="insight-muted">
        {props.fetching?.name === name ? stepText(props.fetching) : t("Hämta och öppna")}
      </span>
    </button>
  ));
}

// Fetching shows how far it has come, and says so when it stops, so the book can be tried again.
function useFetch(props: Props) {
  const [fetching, setFetching] = useState<Progress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const take = async (name: string) => {
    setFailure(null);
    setFetching({ name, done: 0, all: 0 });
    try {
      const dir = await fetchBook(props.libraryDir, name, setFetching);
      if (!dir) return;
      props.onClose();
      props.onOpen(dir);
    } catch (error) {
      setFailure(String(error));
    } finally {
      setFetching(null);
    }
  };
  return { fetching, failure, take };
}

function DriveBooksDialog(props: Props) {
  const [attempt, setAttempt] = useState(0);
  const { fetching, failure, take } = useFetch(props);
  const found = useFound(props.libraryDir, attempt);
  const connect = async () => {
    await platform.googleSignIn?.connect();
    props.onSignedIn();
    setAttempt((count) => count + 1);
  };
  return (
    <Dialog label={t("Hämta från Google Drive")} className="drive-books" onClose={props.onClose}>
      {found.kind === "looking" && <p className="setting-hint">{t("Letar i din Drive…")}</p>}
      {found.kind === "signIn" && (
        <button className="button primary" onClick={() => void connect()}>
          {t("Koppla Drive")}
        </button>
      )}
      {found.kind === "books" && (
        <BookList names={found.names} fetching={fetching} onTake={(name) => void take(name)} />
      )}
      {failure && (
        <p className="backup-problem" role="alert">
          {t("Boken kunde inte hämtas klart: {reason}. Försök igen.", { reason: failure })}
        </p>
      )}
    </Dialog>
  );
}

/** Hämta från Google Drive…: a book made on another device, brought to this one and kept in sync. */
export function useDriveBooksDialog(
  input: Omit<Props, "onClose" | "libraryDir"> & { libraryDir: string | null },
) {
  const [isOpen, setOpen] = useState(false);
  const { libraryDir } = input;
  const canFetch = platform.googleSignIn !== undefined && libraryDir !== null;
  return {
    open: canFetch ? () => setOpen(true) : null,
    layer: isOpen && libraryDir && (
      <DriveBooksDialog {...input} libraryDir={libraryDir} onClose={() => setOpen(false)} />
    ),
  };
}
