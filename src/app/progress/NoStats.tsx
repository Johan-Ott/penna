import { t } from "../../i18n/i18n.js";

// Before the first day of writing there is nothing to show but where to begin.
export function NoStats({ onWrite }: { onWrite: () => void }) {
  return (
    <div className="progress-card no-stats">
      <span className="progress-title">{t("Ingen statistik än")}</span>
      <span className="kpi-sub">{t("Skriv en stund idag, så fylls översikten på.")}</span>
      <button className="button secondary small" onClick={onWrite}>
        {t("Börja skriva")}
      </button>
    </div>
  );
}
