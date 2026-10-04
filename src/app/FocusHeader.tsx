import type { Today } from "./useWritingStats.js";
import { t, numberLocale } from "../i18n/i18n.js";

interface FocusHeaderProps {
  location: string;
  wordCount: number;
  today: Today;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onLeave: () => void;
}

// With a daily goal the header shows the day's progress, otherwise the scene's length.
function focusCount({ wordCount, today }: Pick<FocusHeaderProps, "wordCount" | "today">) {
  const format = (words: number) => words.toLocaleString(numberLocale());
  if (today.goal === null) return `${format(wordCount)} ord`;
  return `${format(today.words)} / ${format(today.goal)} ord`;
}

function SettingsButton({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      className="icon-button settings-button"
      aria-label={t("Skrivinställningar")}
      aria-expanded={isOpen}
      onClick={onToggle}
    >
      Aa
    </button>
  );
}

/** The quiet header of the focus mode: a way out, where you are, and the settings. */
export function FocusHeader(props: FocusHeaderProps) {
  return (
    <header className="focus-header">
      <button className="link-button quiet" onClick={props.onLeave}>
        {t("Esc · lämna fokus")}
      </button>
      <span>{props.location}</span>
      <span className="focus-header-end">
        <span>{focusCount(props)}</span>
        <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
      </span>
    </header>
  );
}
