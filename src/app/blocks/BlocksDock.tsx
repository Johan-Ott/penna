import { useState, type ReactNode } from "react";
import { SoundIcon } from "../shell/icons.js";
import { SprintButton } from "../sprint/SprintBar.js";
import { levels } from "./ambience.js";
import { BlockPanel } from "./BlockPanel.js";
import { isSoundPlaying, SoundsBlock } from "./SoundsBlock.js";
import { t } from "../../i18n/i18n.js";

// The blocks as icons at the text's foot on the right, before Granska: Ljud and the sprint.
// One opens as a panel that can be moved, and closing it makes it an icon again.

export function BlocksDock({ review }: { review: ReactNode }) {
  const [isSoundOpen, setSoundOpen] = useState(false);
  const isPlaying = isSoundPlaying(levels.use());
  const state = [isSoundOpen && "chosen", isPlaying && "playing"].filter(Boolean).join(" ");
  return (
    <>
      {isSoundOpen && (
        <BlockPanel id="ljud" title={t("Ljud")} onClose={() => setSoundOpen(false)}>
          <SoundsBlock />
        </BlockPanel>
      )}
      <div className="blocks-dock">
        <button
          className={state ? `dock-button ${state}` : "dock-button"}
          aria-label={t("Ljud")}
          aria-pressed={isSoundOpen}
          title={t("Ljud")}
          onClick={() => setSoundOpen(!isSoundOpen)}
        >
          <SoundIcon />
        </button>
        <SprintButton look="dock-button" />
        {review}
      </div>
    </>
  );
}
