import { useCallback, useEffect, useState } from "react";
import {
  listBackups,
  restoreBackup,
  type BackupFile,
  type BookBackups,
} from "../../project/backups.js";
import { Dialog } from "../controls.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { backupNow } from "../useAutoBackup.js";
import { numberLocale, t } from "../../i18n/i18n.js";

type BackupsApp = {
  open: (dir: string) => Promise<void>;
  startup: { preferences: { libraryDir: string | null } };
};

const when = (time: number) =>
  new Date(time).toLocaleString(numberLocale(), { dateStyle: "medium", timeStyle: "short" });

function useBackups() {
  const [books, setBooks] = useState<BookBackups[] | null>(null);
  const reload = useCallback(async () => {
    const backups = platform.backups;
    if (backups) setBooks(await listBackups(platform.fileSystem, await backups.dir()));
  }, []);
  useEffect(() => void reload().catch(recordFailure("Säkerhetskopior")), [reload]);
  return { books, reload };
}

// The copy becomes a book of its own next to the others; the original is never touched.
async function restore(app: BackupsApp, book: string, file: BackupFile) {
  const library = app.startup.preferences.libraryDir ?? (await platform.knownFolders()).documents;
  const bytes = await platform.fileSystem.readBytes(file.path);
  const name = t("{book} från {date}", { book, date: when(file.time).replace(/:/g, ".") });
  await app.open(await restoreBackup(platform.fileSystem, bytes, library, name));
}

function SaveNow(props: { dirs: string[]; onSaved: () => void }) {
  const [label, setLabel] = useState("");
  const [isSaving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    await backupNow(props.dirs, label.trim() || null).catch(recordFailure("Säkerhetskopia"));
    setSaving(false);
    setLabel("");
    props.onSaved();
  };
  return (
    <div className="backup-save">
      <input
        aria-label={t("Namn på kopian")}
        placeholder={t("Namn, till exempel Före redaktören (frivilligt)")}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
      />
      <button className="button secondary" disabled={isSaving} onClick={() => void save()}>
        {t("Spara kopia nu")}
      </button>
    </div>
  );
}

function BookCopies(props: { app: BackupsApp; entry: BookBackups; onRestore: () => void }) {
  const { entry } = props;
  const pick = (file: BackupFile) =>
    void restore(props.app, entry.book, file)
      .then(props.onRestore)
      .catch(recordFailure("Återställning"));
  return (
    <section className="backup-book">
      <span className="design-section">{entry.book}</span>
      {entry.files.map((file) => (
        <div key={file.path} className="backup-row">
          <span>
            {when(file.time)}
            {file.label && <span className="backup-label">{file.label}</span>}
          </span>
          <button className="link-button" onClick={() => pick(file)}>
            {t("Öppna som kopia")}
          </button>
        </div>
      ))}
    </section>
  );
}

/** Every book's copies, and a copy of the open book on request. */
export function BackupsDialog(props: { app: BackupsApp; dirs: string[]; onClose: () => void }) {
  const { books, reload } = useBackups();
  return (
    <Dialog label={t("Säkerhetskopior")} className="backups-dialog" onClose={props.onClose}>
      <span className="setting-hint">
        {t(
          "Penna kopierar boken när den öppnas och var halvtimme medan du skriver. De tio senaste sparas, en per dag i trettio dagar, och alla du ger ett namn.",
        )}
      </span>
      {props.dirs.length > 0 && <SaveNow dirs={props.dirs} onSaved={() => void reload()} />}
      {books?.length === 0 && <span>{t("Inga kopior än.")}</span>}
      {books?.map((entry) => (
        <BookCopies key={entry.book} app={props.app} entry={entry} onRestore={props.onClose} />
      ))}
    </Dialog>
  );
}

/** The menu item and the dialog it opens; missing where there are no copies, as in the browser. */
export function useBackupsDialog(app: BackupsApp, dirs: string[]) {
  const [isOpen, setOpen] = useState(false);
  const open = platform.backups ? () => setOpen(true) : null;
  const layer = isOpen && <BackupsDialog app={app} dirs={dirs} onClose={() => setOpen(false)} />;
  return { open, layer };
}
