import { createStore } from "@llkit/store.js";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { readStoredObject, writeStored } from "@llkit/storage/keyValueStore.js";

// What the user has chosen, kept on this device: whether the first start is done, the app's
// language and its look.

export type Theme = "ljust" | "mörkt" | "system";

export interface Settings {
  isStarted: boolean;
  uiLanguage: "sv" | "en";
  theme: Theme;
}

const KEY = "__APP_SLUG__.app";

export function loadSettings(): Settings {
  const stored = readStoredObject(browserStorage(), KEY);
  return {
    isStarted: stored["isStarted"] === true,
    uiLanguage: stored["uiLanguage"] === "en" ? "en" : "sv",
    theme: stored["theme"] === "ljust" || stored["theme"] === "mörkt" ? stored["theme"] : "system",
  };
}

const settings = createStore(loadSettings());

export const useSettings = settings.use;

/** A change of language reloads the window, since texts are translated as the app starts. */
export function changeSettings(change: Partial<Settings>) {
  const next = { ...settings.get(), ...change };
  writeStored(browserStorage(), KEY, next);
  settings.set(next);
  if (change.uiLanguage) window.location.reload();
}
