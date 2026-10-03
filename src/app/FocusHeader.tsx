import { SettingsButton } from "./Toolbar.js";
import type { Today } from "./useWritingStats.js";

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
  const format = (words: number) => words.toLocaleString("sv-SE");
  if (today.goal === null) return `${format(wordCount)} ord`;
  return `${format(today.words)} / ${format(today.goal)} ord`;
}

/** The quiet header of the focus mode: a way out, where you are, and the settings. */
export function FocusHeader(props: FocusHeaderProps) {
  return (
    <header className="focus-header">
      <button className="link-button quiet" onClick={props.onLeave}>
        Esc · lämna fokus
      </button>
      <span>{props.location}</span>
      <span className="focus-header-end">
        <span>{focusCount(props)}</span>
        <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
      </span>
    </header>
  );
}
