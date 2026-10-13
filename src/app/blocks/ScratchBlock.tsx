import { useEffect, useRef, useState } from "react";
import { writeAtomic } from "../../storage/atomicWrite.js";
import { joinPath, readIfThere } from "../../storage/fileSystem.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

// Kladdlapp: loose thoughts while writing, without leaving the scene. A file of its own in the
// book's folder, so it syncs and is backed up with the book.

const SCRATCH = "kladdlapp.md";
const SAVE_DELAY = 600;

function useScratch(dir: string) {
  const [text, setText] = useState<string | null>(null);
  const pending = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const path = joinPath(dir, SCRATCH);
  const save = () => {
    clearTimeout(timer.current);
    if (pending.current === null) return;
    const written = pending.current;
    pending.current = null;
    void writeAtomic(platform.fileSystem, path, written).catch(recordFailure("Kladdlapp"));
  };
  useEffect(() => {
    let isCurrent = true;
    void readIfThere(platform.fileSystem, path)
      .then((read) => isCurrent && setText(read ?? ""))
      .catch(() => isCurrent && setText(""));
    return () => {
      isCurrent = false;
      save();
    };
  }, [path]);
  const change = (next: string) => {
    setText(next);
    pending.current = next;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DELAY);
  };
  return { text, change };
}

export function ScratchBlock({ dir }: { dir: string }) {
  const { text, change } = useScratch(dir);
  return (
    <textarea
      className="scratch"
      value={text ?? ""}
      disabled={text === null}
      placeholder={t("Lösa tankar medan du skriver. De sparas i boken.")}
      aria-label={t("Kladdlapp")}
      onChange={(event) => change(event.target.value)}
    />
  );
}
