import { describe, expect, it, vi } from "vitest";
import { provideAppName } from "@llkit/appInfo.js";
import { setUiLanguage } from "@llkit/i18n.js";
import { changesIn, keepNotes, keptNotes } from "@llkit/releaseNotes.js";

provideAppName("Skrivro");

// The tests run outside a browser, so the kept notes go to a stand-in for localStorage.
const kept = new Map<string, string>();
vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => kept.get(key) ?? null,
    setItem: (key: string, value: string) => kept.set(key, value),
  },
});

const notes = "Skrivro 0.5, öppen beta.\n\n* Tidslinje | Timeline\n- Bara svenska\nLadda ner här.";

describe("release notes", () => {
  it("reads the Swedish list, or the one under ### New, from a release", () => {
    const release =
      "### Nytt\n- Tidslinje\n\n### New\n- Timeline\n\n**Windows:** Skrivro-setup.exe";

    setUiLanguage("sv");
    expect(changesIn(release)).toEqual(["Tidslinje"]);

    setUiLanguage("en");
    expect(changesIn(release)).toEqual(["Timeline"]);
  });

  it("shows each change in the app's language, and only the changes", () => {
    setUiLanguage("sv");
    expect(changesIn(notes)).toEqual(["Tidslinje", "Bara svenska"]);

    setUiLanguage("en");
    expect(changesIn(notes)).toEqual(["Timeline", "Bara svenska"]);
  });

  it("keeps an update's notes for the version they belong to", () => {
    keepNotes("0.5.0", notes);

    expect(keptNotes("0.5.0")).toBe(notes);
    expect(keptNotes("0.4.1")).toBe("");
  });
});
