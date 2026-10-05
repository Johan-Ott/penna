import { useState } from "react";
import { usePhone } from "../phone/usePhone.js";
import { useShortcut } from "../useShortcut.js";
import { paletteEntries, type PaletteContext } from "./paletteEntries.js";

export function usePalette(context: PaletteContext | null) {
  const [isOpen, setOpen] = useState(false);
  // A phone has no reading view, so Läs is left out there.
  const isPhone = usePhone();
  useShortcut("k", () => setOpen((current) => !current));
  return {
    isOpen: isOpen && context !== null,
    entries: context ? paletteEntries(isPhone ? { ...context, read: null } : context) : [],
    open: () => setOpen(true),
    close: () => setOpen(false),
  };
}
