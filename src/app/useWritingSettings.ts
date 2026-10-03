import { useCallback, useEffect, useState } from "react";
import { loadSettings, saveSettings, type WritingSettings } from "../editor/writingSettings.js";
import { browserStorage } from "./browserStorage.js";

export type SettingsChange = (current: WritingSettings) => WritingSettings;

// Dark when the writer asks for it, otherwise as the system says.
function useTheme(isDarkForced: boolean) {
  useEffect(() => {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset["theme"] =
        isDarkForced || systemDark.matches ? "dark" : "light";
    };
    apply();
    systemDark.addEventListener("change", apply);
    return () => systemDark.removeEventListener("change", apply);
  }, [isDarkForced]);
}

export function useWritingSettings() {
  const [settings, setSettings] = useState(() => loadSettings(browserStorage()));
  // Changes start from the current settings, so quick changes in a row never undo each other.
  const update = useCallback((change: SettingsChange) => {
    setSettings((current) => {
      const next = change(current);
      saveSettings(browserStorage(), next);
      return next;
    });
  }, []);
  useTheme(settings.darkTheme);
  return { settings, update };
}
