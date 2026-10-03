import { heatmap, shortDay } from "../../project/progress.js";
import type { Stats } from "../../project/stats.js";

const format = (words: number) => words.toLocaleString("sv-SE");

function HeatLegend() {
  return (
    <div className="heat-legend">
      <span>Mindre</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <div key={level} className={`heat level-${level}`} />
      ))}
      <span>Mer</span>
    </div>
  );
}

/** The last 12 weeks, shaded by how much of the daily goal was written. */
export function Heatmap({
  stats,
  today,
  dailyGoal,
}: {
  stats: Stats;
  today: string;
  dailyGoal: number | null;
}) {
  return (
    <div className="progress-card">
      <div className="progress-row">
        <span className="progress-title">Senaste 12 veckorna</span>
        <span className="kpi-sub">Ord per dag</span>
      </div>
      <div className="heatmap">
        {heatmap(stats, today, dailyGoal).map((cell) => (
          <div
            key={cell.day}
            className={cell.level === null ? "heat future" : `heat level-${cell.level}`}
            title={
              cell.level === null ? undefined : `${shortDay(cell.day)}: ${format(cell.words)} ord`
            }
          />
        ))}
      </div>
      <HeatLegend />
    </div>
  );
}
