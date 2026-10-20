import { describe, expect, it } from "vitest";
import {
  forgetProject,
  loadPreferences,
  rememberProject,
  savePreferences,
  START_PREFERENCES,
} from "../src/app/appPreferences";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("app preferences", () => {
  it("start with onboarding not done and no folders", () => {
    expect(loadPreferences(memoryStorage())).toEqual(START_PREFERENCES);
    expect(START_PREFERENCES.isOnboardingDone).toBe(false);
  });

  it("remember the library and the last project", () => {
    const storage = memoryStorage();
    const preferences = {
      isOnboardingDone: true,
      libraryDir: "C:/OneDrive/Skrivro",
      lastProjectDir: "C:/OneDrive/Skrivro/Isen.skrivro",
      knownProjects: ["D:/Arkiv/Fyren.skrivro"],
      authorName: "Elin Berg",
      defaultDailyGoal: 750,
      isAutoSnapshotOn: false,
      uiLanguage: "en" as const,
      bookLanguage: "en-GB",
      reminderHour: 20,
      isDriveSyncOn: true,
    };

    savePreferences(storage, preferences);

    expect(loadPreferences(storage)).toEqual(preferences);
  });

  it("ignore stored values of the wrong kind", () => {
    const storage = memoryStorage({ "skrivro.app": '{"isOnboardingDone":"ja","libraryDir":5}' });

    expect(loadPreferences(storage)).toEqual(START_PREFERENCES);
  });
});

describe("settings in the app preferences", () => {
  it("start with no author, 1 000 words a day and automatic snapshots on", () => {
    const preferences = loadPreferences(memoryStorage());

    expect(preferences).toMatchObject({
      authorName: "",
      defaultDailyGoal: 1000,
      isAutoSnapshotOn: true,
    });
  });

  it("keep a daily goal only when it is a positive whole number", () => {
    const goals = ["0", "-5", "12.5", '"mycket"'].map(
      (goal) =>
        loadPreferences(memoryStorage({ "skrivro.app": `{"defaultDailyGoal":${goal}}` }))
          .defaultDailyGoal,
    );

    expect(goals).toEqual([1000, 1000, 1000, 1000]);
  });
});

describe("known projects", () => {
  it("remembers a project once, and forgets it again", () => {
    const once = rememberProject(START_PREFERENCES, "D:/Arkiv/Fyren.skrivro");
    const twice = rememberProject(once, "D:/Arkiv/Fyren.skrivro");

    expect(twice.knownProjects).toEqual(["D:/Arkiv/Fyren.skrivro"]);
    expect(twice.lastProjectDir).toBe("D:/Arkiv/Fyren.skrivro");
    expect(forgetProject(twice, "D:/Arkiv/Fyren.skrivro").knownProjects).toEqual([]);
  });

  it("drops stored entries that are not text", () => {
    const storage = memoryStorage({ "skrivro.app": '{"knownProjects":["D:/A.skrivro",7]}' });

    expect(loadPreferences(storage).knownProjects).toEqual(["D:/A.skrivro"]);
  });
});
