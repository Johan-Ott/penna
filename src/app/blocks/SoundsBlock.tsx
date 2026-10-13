import { levels, setLevel, type SoundId } from "./ambience.js";
import { t } from "../../i18n/i18n.js";

const SOUNDS: [SoundId, string, string][] = [
  ["regn", t("Regn"), "🌧"],
  ["brasa", t("Brasa"), "🔥"],
  ["vind", t("Vind"), "🌬"],
  ["brus", t("Brus"), "〰"],
];

export const isSoundPlaying = (all: Record<SoundId, number>) =>
  Object.values(all).some((level) => level > 0);

function SoundTile({ id, name, mark }: { id: SoundId; name: string; mark: string }) {
  const level = levels.use()[id];
  return (
    <label className={level > 0 ? "sound-tile on" : "sound-tile"}>
      <button
        className="sound-mark"
        aria-label={level > 0 ? t("Stäng av {name}", { name }) : t("Spela {name}", { name })}
        onClick={() => setLevel(id, level > 0 ? 0 : 0.5)}
      >
        {mark}
      </button>
      <span className="sound-name">{name}</span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={level}
        aria-label={t("Volym för {name}", { name })}
        onChange={(event) => setLevel(id, Number(event.target.value))}
      />
    </label>
  );
}

/** The room's sounds, mixed by their levels; they keep playing when the block is closed. */
export function SoundsBlock() {
  return (
    <div className="sounds">
      {SOUNDS.map(([id, name, mark]) => (
        <SoundTile key={id} id={id} name={name} mark={mark} />
      ))}
    </div>
  );
}
