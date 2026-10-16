import type { AppState } from "../App.js";
import { useNamedHere } from "../blocks/InSceneBlock.js";
import { usePhone } from "./usePhone.js";
import { t } from "../../i18n/i18n.js";

// On a phone, what the computer keeps in its blocks is at the top of the scene instead: who and
// what is named here, each opening its note, and how much Granska has to look at.

export function SceneStrip({ app }: { app: AppState }) {
  const named = useNamedHere(app);
  const count = app.writingMode.review.count ?? 0;
  if (!usePhone() || (named.length === 0 && count === 0)) return null;
  const open = (dir: string, sceneId: string) =>
    app.writingMode.setBeside({ kind: "text", dir, sceneId });
  return (
    <nav className="scene-strip" aria-label={t("I scenen")}>
      {count > 0 && (
        <button className="scene-chip review" onClick={() => app.writingMode.setReviewOpen(true)}>
          {t("{count} att se över", { count })}
        </button>
      )}
      {named.map((card) => (
        <button key={card.id} className="scene-chip" onClick={() => open(card.dir, card.id)}>
          {card.name}
        </button>
      ))}
    </nav>
  );
}
