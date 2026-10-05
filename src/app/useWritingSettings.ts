import { useCallback, useEffect, useState } from "react";
import {
  loadSettings,
  saveSettings,
  type Theme,
  type WritingSettings,
} from "../editor/writingSettings.js";
import { browserStorage } from "./browserStorage.js";

export type SettingsChange = (current: WritingSettings) => WritingSettings;

function useTheme(theme: Theme) {
  useEffect(() => {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const isDark = theme === "system" ? systemDark.matches : theme === "mörkt";
      document.documentElement.dataset["theme"] = isDark ? "dark" : "light";
    };
    apply();
    systemDark.addEventListener("change", apply);
    return () => systemDark.removeEventListener("change", apply);
  }, [theme]);
}

export function useWritingSettings() {
  const [settings, setSettings] = useState(() => loadSettings(browserStorage()));
  // Changes start from the current settings, so quick changes never undo each other.
  const update = useCallback((change: SettingsChange) => {
    setSettings((current) => {
      const next = change(current);
      saveSettings(browserStorage(), next);
      return next;
    });
  }, []);
  useTheme(settings.theme);
  return { settings, update };
}
