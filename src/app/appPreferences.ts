import { readStoredObject, writeStored, type KeyValueStorage } from "../storage/keyValueStore.js";

/** What Penna remembers between starts on this computer. */
export interface AppPreferences {
  isOnboardingDone: boolean;
  /** The Penna folder where new projects are made, for example OneDrive/Penna. */
  libraryDir: string | null;
  lastProjectDir: string | null;
  /** Projects opened from outside the library, so the shelf can show them too. */
  knownProjects: string[];
  /** Used in export; empty until the writer gives one. */
  authorName: string;
  /** The daily goal a new project starts with. */
  defaultDailyGoal: number;
  isAutoSnapshotOn: boolean;
}

export const START_PREFERENCES: AppPreferences = {
  isOnboardingDone: false,
  libraryDir: null,
  lastProjectDir: null,
  knownProjects: [],
  authorName: "",
  defaultDailyGoal: 1000,
  isAutoSnapshotOn: true,
};

const STORAGE_KEY = "penna.app";
const textOrNull = (value: unknown) => (typeof value === "string" ? value : null);
const isGoal = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

export function loadPreferences(storage: KeyValueStorage): AppPreferences {
  const stored = readStoredObject(storage, STORAGE_KEY);
  return {
    isOnboardingDone: stored["isOnboardingDone"] === true,
    libraryDir: textOrNull(stored["libraryDir"]),
    lastProjectDir: textOrNull(stored["lastProjectDir"]),
    knownProjects: Array.isArray(stored["knownProjects"])
      ? stored["knownProjects"].filter((dir): dir is string => typeof dir === "string")
      : [],
    authorName: textOrNull(stored["authorName"]) ?? "",
    defaultDailyGoal: isGoal(stored["defaultDailyGoal"])
      ? stored["defaultDailyGoal"]
      : START_PREFERENCES.defaultDailyGoal,
    isAutoSnapshotOn: stored["isAutoSnapshotOn"] !== false,
  };
}

export const savePreferences = (storage: KeyValueStorage, preferences: AppPreferences) =>
  writeStored(storage, STORAGE_KEY, preferences);

export const rememberProject = (preferences: AppPreferences, dir: string): AppPreferences => ({
  ...preferences,
  isOnboardingDone: true,
  lastProjectDir: dir,
  knownProjects: preferences.knownProjects.includes(dir)
    ? preferences.knownProjects
    : [...preferences.knownProjects, dir],
});

export const forgetProject = (preferences: AppPreferences, dir: string): AppPreferences => ({
  ...preferences,
  lastProjectDir: preferences.lastProjectDir === dir ? null : preferences.lastProjectDir,
  knownProjects: preferences.knownProjects.filter((known) => known !== dir),
});
