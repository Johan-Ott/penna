import { useState, type FormEvent } from "react";
import { Dialog, DialogActions } from "@llkit/controls.js";
import { t } from "../../i18n/i18n.js";

function RenameBookDialog(props: {
  title: string;
  onRename: (title: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(props.title);
  const isReady = title.trim() !== "" && title.trim() !== props.title;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!isReady) return;
    props.onRename(title.trim());
    props.onClose();
  };
  return (
    <Dialog label={t("Byt namn på boken")} onClose={props.onClose}>
      <form onSubmit={submit}>
        <label className="onboarding-field">
          <span className="field-label">{t("Titel")}</span>
          <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <DialogActions isReady={isReady} label={t("Byt namn")} onClose={props.onClose} />
      </form>
    </Dialog>
  );
}

/** Byt namn… for a book: the title on the shelf and in the book, the folder left as it is. */
export function useRenameBook(title: string, onRename: (title: string) => void) {
  const [isOpen, setOpen] = useState(false);
  return {
    open: () => setOpen(true),
    layer: isOpen && (
      <RenameBookDialog title={title} onRename={onRename} onClose={() => setOpen(false)} />
    ),
  };
}
