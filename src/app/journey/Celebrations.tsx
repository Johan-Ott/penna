import { useEffect } from "react";
import type { Celebration } from "../../project/inkwell.js";
import { dismissCelebration, useCelebrations } from "./journeyEvents.js";

const SHOWN_MS = 4000;

const GLYPHS: Record<Celebration["kind"], string> = {
  goal: "✓",
  streak: "",
  level: "",
  rank: "",
  best: "★",
  back: "↩",
};

// A streak shows its days, a level or rank its first letter.
function glyphOf(celebration: Celebration) {
  if (celebration.kind === "streak") return celebration.title.match(/\d+/)?.[0] ?? "7";
  return GLYPHS[celebration.kind] || celebration.title.split(": ")[1]?.charAt(0) || "✓";
}

const isGreen = (celebration: Celebration) =>
  celebration.kind === "goal" || celebration.kind === "level" || celebration.kind === "rank";

function CelebrationToast({ celebration }: { celebration: Celebration }) {
  useEffect(() => {
    const timer = setTimeout(() => dismissCelebration(celebration), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [celebration]);
  return (
    <div className="celebration" role="status">
      <span className={isGreen(celebration) ? "celebration-badge green" : "celebration-badge"}>
        {glyphOf(celebration)}
      </span>
      <span className="celebration-words">
        <span className="celebration-title">{celebration.title}</span>
        <span className="celebration-text">{celebration.text}</span>
      </span>
    </div>
  );
}

/** Down in the left corner for four seconds; never in the way of the text. */
export function Celebrations() {
  const celebrations = useCelebrations();
  return (
    <div className="celebrations">
      {celebrations.slice(-3).map((celebration) => (
        <CelebrationToast
          key={`${celebration.kind}${celebration.title}`}
          celebration={celebration}
        />
      ))}
    </div>
  );
}
