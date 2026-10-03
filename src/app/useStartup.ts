import { useCallback, useEffect, useState } from "react";
import {
  loadPreferences,
  rememberProject,
  savePreferences,
  type AppPreferences,
} from "./appPreferences.js";
import { browserStorage } from "./browserStorage.js";
import { platform } from "./platform.js";

export type PreferenceChange = (current: AppPreferences) => AppPreferences;

function useAppPreferences() {
  const [preferences, setPreferences] = useState(() => loadPreferences(browserStorage()));
  const update = useCallback((change: PreferenceChange) => {
    setPreferences((current) => {
      const next = change(current);
      savePreferences(browserStorage(), next);
      return next;
    });
  }, []);
  return { preferences, update };
}

/**
 * Opens the last project when its folder is still there. Until that is known `isStarting` is
 * true, so the welcome screen never flashes by before the project appears.
 */
export function useStartup(open: (dir: string) => Promise<void>, openDir: string | null) {
  const { preferences, update } = useAppPreferences();
  const [isStarting, setStarting] = useState(true);
  // Read once: only the preferences at start decide what opens.
  const [startDir] = useState(preferences.lastProjectDir);
  useEffect(() => {
    const reopen = async () => {
      if (startDir && (await platform.folderExists(startDir))) await open(startDir);
    };
    void reopen().finally(() => setStarting(false));
  }, [startDir, open]);
  useEffect(() => {
    if (openDir) update((current) => rememberProject(current, openDir));
  }, [openDir, update]);
  return { preferences, updatePreferences: update, isStarting };
}
