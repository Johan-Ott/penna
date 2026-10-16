import { shortcutOf, type CommandId } from "../shortcuts.js";
import type { MouseEvent, ReactNode } from "react";

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
