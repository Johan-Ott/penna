import { useEffect } from "react";
import type { SaveStatus } from "../storage/autosave.js";
import type { SaveFailure } from "../storage/saveError.js";
import { t, numberLocale } from "../i18n/i18n.js";

const FAILURE_MESSAGES: Record<SaveFailure, string> = {
  blocked: t("Filen används av ett annat program, ofta molnsynken, eller är skrivskyddad."),
  diskFull: t("Disken är full."),
  readOnly: t("Enheten är skrivskyddad."),
  folderMissing: t("Projektmappen hittas inte. Är disken eller molnmappen ansluten?"),
  unknown: t("Scenen kunde inte sparas."),
};

export function SaveToast({ status, onRetry }: { status: SaveStatus | null; onRetry: () => void }) {
  if (status?.kind !== "failed") return null;
  return (
    <div className="toast" role="alert">
      <span>
        {t("{reason} Din text finns kvar i appen.", { reason: FAILURE_MESSAGES[status.reason] })}
      </span>
      <span className="toast-meta">{t("Försöker igen…")}</span>
      <button className="link-button" onClick={onRetry}>
        {t("Försök nu")}
      </button>
    </div>
  );
}

export function TreeFailureToast({ failure }: { failure: SaveFailure | null }) {
  if (!failure) return null;
  return (
    <div className="toast" role="alert">
      <span>
        {t("Ordningen i strukturen kunde inte sparas. {reason}", {
          reason: FAILURE_MESSAGES[failure],
        })}
      </span>
      <span className="toast-meta">{t("Sparas vid nästa ändring")}</span>
    </div>
  );
}

export function ReadOnlyNotice({ isReadOnly }: { isReadOnly: boolean }) {
  if (!isReadOnly) return null;
  return (
    <div className="toast" role="status">
      <span>{t("Projektet är sparat av en nyare version av Penna och går bara att läsa.")}</span>
      <span className="toast-meta">{t("Uppdatera Penna för att skriva i det")}</span>
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
  const noun = done.count === 1 ? t("förekomst") : t("förekomster");
  return (
    <div className="toast inverted" role="status">
      <span>
        {t("Ändrade {count} {noun} av ”{search}”", {
          count: done.count.toLocaleString(numberLocale()),
          noun,
          search: done.search,
        })}
      </span>
      <button className="link-button" onClick={props.onUndo}>
        {t("Ångra")}
      </button>
    </div>
  );
}
