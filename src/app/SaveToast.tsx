import { useEffect } from "react";
import type { SaveStatus } from "../storage/autosave.js";
import type { SaveFailure } from "../storage/saveError.js";

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  blocked: "Filen används av ett annat program, ofta molnsynken, eller är skrivskyddad.",
  diskFull: "Disken är full.",
  readOnly: "Enheten är skrivskyddad.",
  folderMissing: "Projektmappen hittas inte. Är disken eller molnmappen ansluten?",
  unknown: "Scenen kunde inte sparas.",
};

export function SaveToast({ status, onRetry }: { status: SaveStatus | null; onRetry: () => void }) {
  if (status?.kind !== "failed") return null;
  return (
    <div className="toast" role="alert">
      <span>{FAILURE_MESSAGES[status.reason]} Din text finns kvar i appen.</span>
      <span className="toast-meta">Försöker igen…</span>
      <button className="link-button" onClick={onRetry}>
        Försök nu
      </button>
    </div>
  );
}

export function TreeFailureToast({ failure }: { failure: SaveFailure | null }) {
  if (!failure) return null;
  return (
    <div className="toast" role="alert">
      <span>Ordningen i strukturen kunde inte sparas. {FAILURE_MESSAGES[failure]}</span>
      <span className="toast-meta">Sparas vid nästa ändring</span>
    </div>
  );
}

const TOAST_MS = 8000;

/** "Ändrade 3 förekomster av ”Sjöbergh”" after replacing in the whole manuscript, with Ångra. */
export function ReplaceToast(props: {
  done: { count: number; search: string } | null;
  onUndo: () => void;
  onDismiss: () => void;
}) {
  const { done, onDismiss } = props;
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(onDismiss, TOAST_MS);
    return () => clearTimeout(timer);
  }, [done, onDismiss]);
  if (!done) return null;
  const noun = done.count === 1 ? "förekomst" : "förekomster";
  return (
    <div className="toast inverted" role="status">
      <span>
        Ändrade {done.count.toLocaleString("sv-SE")} {noun} av ”{done.search}”
      </span>
      <button className="link-button" onClick={props.onUndo}>
        Ångra
      </button>
    </div>
  );
}
