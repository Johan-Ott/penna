import { isUiLanguage, type UiLanguage } from "../i18n/i18n.js";
import {
  readStoredObject,
  writeStored,
  type KeyValueStorage,
} from "@llkit/storage/keyValueStore.js";

export interface AppPreferences {
  isOnboardingDone: boolean;
  /** The Skrivro folder where new projects are made, for example OneDrive/Skrivro. */
  libraryDir: string | null;
  lastProjectDir: string | null;
  /** Projects opened from outside the library, so the shelf can show them too. */
  knownProjects: string[];
  authorName: string;
  defaultDailyGoal: number;
  isAutoSnapshotOn: boolean;
  /** The language of Skrivro's own interface; each book has its own language too. */
  uiLanguage: UiLanguage;
  /** The language a new book is written in, such as "sv-SE"; the first start chooses it. */
  bookLanguage: string;
  /** The hour of the daily reminder when nothing is written yet; null is off. */
  reminderHour: number | null;
  isDriveSyncOn: boolean;
}

export const START_PREFERENCES: AppPreferences = {
  isOnboardingDone: false,
  libraryDir: null,
  lastProjectDir: null,
  knownProjects: [],
  authorName: "",
  defaultDailyGoal: 1000,
  isAutoSnapshotOn: true,
  uiLanguage: "sv",
  bookLanguage: "sv-SE",
  reminderHour: null,
  isDriveSyncOn: false,
};

const STORAGE_KEY = "skrivro.app";
const textOrNull = (value: unknown) => (typeof value === "string" ? value : null);
const isHour = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 24;
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
    uiLanguage: isUiLanguage(stored["uiLanguage"]) ? stored["uiLanguage"] : "sv",
    bookLanguage: textOrNull(stored["bookLanguage"]) ?? START_PREFERENCES.bookLanguage,
    reminderHour: isHour(stored["reminderHour"]) ? stored["reminderHour"] : null,
    isDriveSyncOn: stored["isDriveSyncOn"] === true,
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
