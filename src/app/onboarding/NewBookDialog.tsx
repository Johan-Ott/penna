import { useState } from "react";
import { Dialog } from "../controls.js";
import { t } from "../../i18n/i18n.js";

// A new book is its title and what kind it is; Penna suggests the parts and chapters from the
// kind. Goals, narration and the rest are asked where they are used.

const TYPES: [string, string][] = [
  ["roman", t("Roman")],
  ["noveller", t("Noveller")],
  ["fackbok", t("Fackbok")],
  ["annat", t("Annat")],
];

function Kinds({ type, onType }: { type: string; onType: (type: string) => void }) {
  return (
    <div className="new-book-kinds" role="radiogroup" aria-label={t("Vad skriver du?")}>
      {TYPES.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="radio"
          className="kind-chip"
          aria-checked={type === id}
          onClick={() => onType(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function NewBookDialog(props: {
  onCreate: (title: string, type: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("roman");
  const [isMaking, setMaking] = useState(false);
  const create = () => {
    setMaking(true);
    void props.onCreate(title.trim(), type).finally(() => setMaking(false));
  };
  return (
    <Dialog label={t("Ny bok")} className="new-book-dialog" onClose={props.onClose}>
      <form onSubmit={(event) => (event.preventDefault(), create())}>
        <input
          autoFocus
          className="settings-text"
          aria-label={t("Titel")}
          placeholder={t("Arbetstitel duger")}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <Kinds type={type} onType={setType} />
        <button type="submit" className="button primary" disabled={isMaking}>
          {t("Skapa")}
        </button>
      </form>
    </Dialog>
  );
}
