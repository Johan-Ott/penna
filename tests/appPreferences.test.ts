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
      libraryDir: "C:/OneDrive/Penna",
      lastProjectDir: "C:/OneDrive/Penna/Isen.penna",
      knownProjects: ["D:/Arkiv/Fyren.penna"],
    };

    savePreferences(storage, preferences);

    expect(loadPreferences(storage)).toEqual(preferences);
  });

  it("ignore stored values of the wrong kind", () => {
    const storage = memoryStorage({ "penna.app": '{"isOnboardingDone":"ja","libraryDir":5}' });

    expect(loadPreferences(storage)).toEqual(START_PREFERENCES);
  });
});

describe("known projects", () => {
  it("remembers a project once, and forgets it again", () => {
    const once = rememberProject(START_PREFERENCES, "D:/Arkiv/Fyren.penna");
    const twice = rememberProject(once, "D:/Arkiv/Fyren.penna");

    expect(twice.knownProjects).toEqual(["D:/Arkiv/Fyren.penna"]);
    expect(twice.lastProjectDir).toBe("D:/Arkiv/Fyren.penna");
    expect(forgetProject(twice, "D:/Arkiv/Fyren.penna").knownProjects).toEqual([]);
  });

  it("drops stored entries that are not text", () => {
    const storage = memoryStorage({ "penna.app": '{"knownProjects":["D:/A.penna",7]}' });

    expect(loadPreferences(storage).knownProjects).toEqual(["D:/A.penna"]);
  });
});
