import { shortcutOf, type CommandId } from "../shortcuts.js";
import type { MouseEvent, ReactNode } from "react";
import { SearchIcon } from "./icons.js";
import { t } from "../../i18n/i18n.js";

/** A button in the top bar, named for the tooltip; `shortcut` adds the keys the writer chose. */
export function IconButton(props: {
  label: string;
  shortcut?: CommandId;
  className?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  const label = props.shortcut ? `${props.label} · ${shortcutOf(props.shortcut)}` : props.label;
  return (
    <button
      className={props.className ? `topbar-button ${props.className}` : "topbar-button"}
      aria-label={label}
      title={label}
      disabled={props.isDisabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

// The palette finds text and runs every command, so its keys stand on the button to be learned.
export function PaletteButton({ onSearch }: { onSearch: () => void }) {
  const label = t("Sök och kommandon");
  const keys = shortcutOf("palette");
  return (
    <button
      className="topbar-button palette-button"
      aria-label={`${label} · ${keys}`}
      title={`${label} · ${keys}`}
      onClick={onSearch}
    >
      <SearchIcon />
      <span className="palette-label">{label}</span>
      <kbd>{keys}</kbd>
    </button>
  );
}
