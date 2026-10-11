import type { Today } from "../useWritingStats.js";
import { numberLocale, t } from "../../i18n/i18n.js";

function dayText({ words, goal }: Today) {
  const format = (count: number) => count.toLocaleString(numberLocale());
  if (!goal) return t("{count} ord idag", { count: format(words) });
  if (words >= goal) return t("Dagens mål nått · {count} ord", { count: format(words) });
  return t("{words} / {goal} ord", { words: format(words), goal: format(goal) });
}

// The day's words; a click opens Insikter, with the goals, the week and the writing journey.
export function DayProgress({ today, onProgress }: { today: Today; onProgress: () => void }) {
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : null;
  return (
    <button
      className="day-progress"
      aria-label={t("Insikter och mål")}
      title={t("Insikter och mål")}
      onClick={onProgress}
    >
      <span>{dayText(today)}</span>
      {share !== null && (
        <span className="day-progress-bar">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
    </button>
  );
}
