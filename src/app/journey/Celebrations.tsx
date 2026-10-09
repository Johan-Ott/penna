import { useEffect } from "react";
import type { Celebration } from "../../project/inkwell.js";
import { dismissCelebration, useCelebrations } from "./journeyEvents.js";
import type { ImageCardId } from "../studio/studioDraw.js";
import { t } from "../../i18n/i18n.js";

const SHOWN_MS = 4000;

const GLYPHS: Record<Celebration["kind"], string> = {
  goal: "✓",
  milestone: "✦",
  streak: "",
  level: "",
  rank: "",
  best: "★",
  back: "↩",
  badge: "",
};

// A streak shows its days, a level or rank its first letter.
function glyphOf(celebration: Celebration) {
  if (celebration.kind === "streak") return celebration.title.match(/\d+/)?.[0] ?? "7";
  return GLYPHS[celebration.kind] || celebration.title.split(": ")[1]?.charAt(0) || "✓";
}

const isGreen = (celebration: Celebration) =>
  ["goal", "level", "rank", "milestone"].includes(celebration.kind);

// The card in Studio a celebration is shared as; a welcome back is nothing to share.
const SHARED_AS: Partial<Record<Celebration["kind"], ImageCardId>> = {
  goal: "vecka",
  streak: "vecka",
  best: "vecka",
  level: "skrivar",
  rank: "skrivar",
  milestone: "milstolpe",
};

type ToastProps = { celebration: Celebration; onShare: (card: ImageCardId) => void };

function useDismissLater(celebration: Celebration) {
  useEffect(() => {
    const timer = setTimeout(() => dismissCelebration(celebration), SHOWN_MS);
    return () => clearTimeout(timer);
  }, [celebration]);
}

function CelebrationToast({ celebration, onShare }: ToastProps) {
  const card = SHARED_AS[celebration.kind];
  useDismissLater(celebration);
  return (
    <div className="celebration" role="status">
      <span className={isGreen(celebration) ? "celebration-badge green" : "celebration-badge"}>
        {glyphOf(celebration)}
      </span>
      <span className="celebration-words">
        <span className="celebration-title">{celebration.title}</span>
        <span className="celebration-text">{celebration.text}</span>
      </span>
      {card && (
        <button
          className="celebration-share"
          onClick={() => (dismissCelebration(celebration), onShare(card))}
        >
          {t("Dela")}
        </button>
      )}
    </div>
  );
}

/** Down in the left corner for four seconds; never in the way of the text. */
export function Celebrations({ onShare }: { onShare: (card: ImageCardId) => void }) {
  const celebrations = useCelebrations();
  return (
    <div className="celebrations">
      {celebrations.slice(-3).map((celebration) => (
        <CelebrationToast
          key={`${celebration.kind}${celebration.title}`}
          celebration={celebration}
          onShare={onShare}
        />
      ))}
    </div>
  );
}
