import { isMac } from "./thisComputer.js";

// How a key combination is written down, apart from the commands that carry them.

export interface Binding {
  key: string;
  shift?: boolean;
  alt?: boolean;
}

const keyName = (key: string) =>
  key.length === 1 ? key.toUpperCase() : key.charAt(0).toUpperCase() + key.slice(1);

/** The key a shortcut is held with, as prose names it. */
export const MODIFIER_NAME = isMac ? "Cmd" : "Ctrl";

/** "Ctrl+Shift+F" on Windows, and a Mac's own "⇧⌘F", as menus and the palette show it. */
export function shortcutText(binding: Binding, isMacComputer = isMac) {
  if (isMacComputer) {
    const keys = [binding.alt && "⌥", binding.shift && "⇧", "⌘", keyName(binding.key)];
    return keys.filter(Boolean).join("");
  }
  const parts = ["Ctrl", binding.shift && "Shift", binding.alt && "Alt", keyName(binding.key)];
  return parts.filter(Boolean).join("+");
}
