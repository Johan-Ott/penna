import { useState } from "react";
import { useShortcut } from "../useShortcut.js";
import { paletteEntries, type PaletteContext } from "./paletteEntries.js";

/** Ctrl+K opens the palette; its entries are built from the project and settings of the moment. */
export function usePalette(context: PaletteContext | null) {
  const [isOpen, setOpen] = useState(false);
  useShortcut("k", () => setOpen((current) => !current));
  return {
    isOpen: isOpen && context !== null,
    entries: context ? paletteEntries(context) : [],
    close: () => setOpen(false),
  };
}
