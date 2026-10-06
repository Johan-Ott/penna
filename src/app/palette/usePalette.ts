import { useState } from "react";
import { usePhone } from "../phone/usePhone.js";
import { useShortcut } from "../useShortcut.js";
import { paletteEntries, type PaletteContext } from "./paletteEntries.js";

export function usePalette(context: PaletteContext | null) {
  const [isOpen, setOpen] = useState(false);
  // A phone has no folders to pick, so that entry is left out there.
  const isPhone = usePhone();
  useShortcut("k", () => setOpen((current) => !current));
  return {
    isOpen: isOpen && context !== null,
    // Made only while open: a long book has hundreds of entries, and the app draws on every key.
    entries:
      isOpen && context
        ? paletteEntries(isPhone ? { ...context, chooseFolder: null } : context)
        : [],
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
