import { SettingsButton } from "./Toolbar.js";

interface FocusHeaderProps {
  location: string;
  wordCount: number;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onLeave: () => void;
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
        <span>{props.wordCount.toLocaleString("sv-SE")} ord</span>
        <SettingsButton isOpen={props.isSettingsOpen} onToggle={props.onToggleSettings} />
      </span>
    </header>
  );
}
