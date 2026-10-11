import { t } from "../i18n/i18n.js";
import { useSyncExternalStore } from "react";

// Whether the text's look (Aa) is open: the top bar opens it, the writing area shows it.
let isOpen = false;
const listeners = new Set<() => void>();

export function setSettingsOpen(next: boolean) {
  isOpen = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};

export function usePanels() {
  const isSettingsOpen = useSyncExternalStore(subscribe, () => isOpen);
  return { isSettingsOpen, setSettingsOpen };
}

// Aa: the text's font, size and spacing, as in focus mode.
export function LookButton() {
  const { isSettingsOpen } = usePanels();
  return (
    <button
      className="topbar-button topbar-look"
      aria-label={t("Skrivinställningar")}
      title={t("Skrivinställningar")}
      aria-expanded={isSettingsOpen}
      onClick={() => setSettingsOpen(!isSettingsOpen)}
    >
      Aa
    </button>
  );
}
