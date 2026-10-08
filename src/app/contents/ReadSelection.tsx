import { useEffect, useState, type KeyboardEvent, type RefObject } from "react";
import { fixedSceneText } from "../../editor/textFix.js";
import { newComment, readComments, writeComments, type Anchor } from "../../project/comments.js";
import { writeAtomic } from "../../storage/atomicWrite.js";
import { joinPath } from "../../storage/fileSystem.js";
import { recordFailure } from "../errorLog.js";
import { platform } from "../platform.js";
import { pickedIn, type Picked } from "./pickedText.js";
import { t } from "../../i18n/i18n.js";

export interface ReadSaving {
  dir: string;
  author: string;
  /** Saves the open scene first and has it read the new text, when the file is the open scene. */
  writeOver: (path: string, write: () => Promise<void>) => Promise<void>;
  /** Reads the book again, so the pages and the comments in Skriv show what was saved. */
  onSaved: () => Promise<void>;
}

type Mode = "fix" | "comment";

// False when the words were changed somewhere else since the page was set.
async function saveFix(saving: ReadSaving, sceneId: string, anchor: Anchor, text: string) {
  const path = joinPath(saving.dir, `scenes/${sceneId}.md`);
  const fixed = fixedSceneText(await platform.fileSystem.readText(path), anchor, text);
  if (fixed === null) return false;
  await saving.writeOver(path, () => writeAtomic(platform.fileSystem, path, fixed));
  return true;
}

async function saveComment(saving: ReadSaving, sceneId: string, anchor: Anchor, body: string) {
  const comments = await readComments(platform.fileSystem, saving.dir, sceneId);
  const comment = newComment(anchor, body, saving.author);
  await writeComments(platform.fileSystem, saving.dir, sceneId, [...comments, comment]);
  return true;
}

// Held still while a dialog is open, since writing in it moves the selection away.
function usePicked(flow: RefObject<HTMLDivElement | null>, isHeld: boolean) {
  const [picked, setPicked] = useState<Picked | null>(null);
  useEffect(() => {
    if (isHeld) return;
    const onChange = () => flow.current && setPicked(pickedIn(flow.current, getSelection()));
    document.addEventListener("selectionchange", onChange);
    return () => document.removeEventListener("selectionchange", onChange);
  }, [flow, isHeld]);
  return { picked, clear: () => setPicked(null) };
}

function hintText(mode: Mode, failed: boolean) {
  if (failed) return t("Texten har ändrats. Rätta den i Skriv.");
  return mode === "fix" ? t("Enter sparar · sidan sätts om") : t("Enter sparar");
}

// Enter saves and Escape closes only the dialog, never the whole reading view.
function onEditKey(event: KeyboardEvent, save: () => void, close: () => void) {
  if (event.key === "Escape") close();
  else if (event.key === "Enter" && !event.shiftKey) save();
  else return;
  event.preventDefault();
}

function EditBox(props: {
  mode: Mode;
  initial: string;
  failed: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(props.initial);
  const label = props.mode === "fix" ? t("Rätta text") : t("Kommentar");
  return (
    <div className="read-edit" role="dialog" aria-label={label}>
      <textarea
        aria-label={label}
        autoFocus
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => onEditKey(event, () => props.onSave(text), props.onClose)}
      />
      <div className="read-edit-foot">
        <span className={props.failed ? "read-edit-hint failed" : "read-edit-hint"}>
          {hintText(props.mode, props.failed)}
        </span>
        <button className="button primary small" onClick={() => props.onSave(text)}>
          {t("Spara")}
        </button>
      </div>
    </div>
  );
}

function SelectionButtons(props: {
  picked: Picked;
  onMode: (mode: Mode) => void;
  onWriteHere: () => void;
}) {
  const hasWords = props.picked.anchor !== null;
  return (
    <div className="read-bar" role="toolbar" aria-label={t("Markering")}>
      {hasWords && <button onClick={() => props.onMode("comment")}>{t("Kommentera")}</button>}
      {hasWords && <button onClick={() => props.onMode("fix")}>{t("Rätta")}</button>}
      <button onClick={props.onWriteHere}>{t("Skriv här")}</button>
    </div>
  );
}

// Either dialog, and whether its save found the words still there.
function useEditing(flow: RefObject<HTMLDivElement | null>, saving: ReadSaving) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [failed, setFailed] = useState(false);
  const { picked, clear } = usePicked(flow, mode !== null);
  const close = () => (setMode(null), setFailed(false), clear(), getSelection()?.removeAllRanges());
  const save = (text: string) => {
    if (!picked?.anchor || !mode) return;
    const write = mode === "fix" ? saveFix : saveComment;
    const failure =
      mode === "fix" ? "Rättelsen kunde inte sparas" : "Kommentaren kunde inte sparas";
    void write(saving, picked.sceneId, picked.anchor, text)
      .then((isSaved) => (isSaved ? (close(), saving.onSaved()) : setFailed(true)))
      .catch(recordFailure(failure));
  };
  return { picked, mode, setMode, failed, close, save };
}

/** Above selected words in the book: comment on them, correct them in place, or write there. */
export function ReadSelection(props: {
  flow: RefObject<HTMLDivElement | null>;
  saving: ReadSaving;
  onWriteHere: (sceneId: string, blockIndex: number) => void;
}) {
  const { picked, mode, setMode, failed, close, save } = useEditing(props.flow, props.saving);
  if (!picked) return null;
  return (
    <div
      className="read-selection"
      style={{ top: picked.top, left: picked.left }}
      onMouseDown={(event) => event.target instanceof HTMLButtonElement && event.preventDefault()}
    >
      <SelectionButtons
        picked={picked}
        onMode={setMode}
        onWriteHere={() => props.onWriteHere(picked.sceneId, picked.blockIndex)}
      />
      {mode && (
        <EditBox
          mode={mode}
          initial={mode === "fix" ? (picked.anchor?.quote ?? "") : ""}
          failed={failed}
          onSave={save}
          onClose={close}
        />
      )}
    </div>
  );
}
