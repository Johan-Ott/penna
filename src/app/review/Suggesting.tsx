import type { AppState } from "../App.js";
import { t } from "../../i18n/i18n.js";

/** Over the text while Förslagsläge is on, so it is never forgotten; Klar ends it. */
export function SuggestingBar({ app }: { app: Pick<AppState, "suggesting"> }) {
  if (!app.suggesting.isSuggesting) return null;
  return (
    <div className="suggesting-bar" role="status">
      <span>{t("Förslagsläge: det du skriver blir förslag")}</span>
      <button className="button primary small" onClick={app.suggesting.stop}>
        {t("Klar")}
      </button>
    </div>
  );
}

/** In Granska: changes typed as suggestions, gone through later as an editor's would be. */
export function SuggestStart({ app }: { app: Pick<AppState, "suggesting" | "revision"> }) {
  if (app.suggesting.isSuggesting || app.revision.isOpen) return null;
  return (
    <section className="review-section">
      <span className="review-heading">{t("Förslag")}</span>
      <span className="setting-hint">
        {t("Skriv ändringar som förslag och godta eller avvisa dem sedan, en i taget.")}
      </span>
      <button className="button secondary small" onClick={app.suggesting.start}>
        {t("Skriv förslag")}
      </button>
    </section>
  );
}
