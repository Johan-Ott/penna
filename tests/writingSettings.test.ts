import { describe, expect, it } from "vitest";
import { sentenceRange, typewriterScrollDelta } from "../src/editor/focus";
import {
  changeSize,
  DEFAULT_SETTINGS,
  loadSettings,
  nextLineHeight,
  proseStyle,
  saveSettings,
} from "../src/editor/writingSettings";

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
}

describe("writing settings", () => {
  it("start from the design's defaults", () => {
    const settings = loadSettings(memoryStorage());

    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings).toMatchObject({ font: "serif", size: 19, lineHeight: 1.8, width: "normal" });
  });

  it("are saved and read back", () => {
    const storage = memoryStorage();

    saveSettings(storage, { ...DEFAULT_SETTINGS, size: 22, focus: "mening" });
    const settings = loadSettings(storage);

    expect(settings.size).toBe(22);
    expect(settings.focus).toBe("mening");
  });

  it("ignore stored values that do not make sense", () => {
    const storage = memoryStorage({
      "penna.writing": '{"size":"stor","font":"comic","indent":false}',
    });

    const settings = loadSettings(storage);

    expect(settings.size).toBe(19);
    expect(settings.font).toBe("serif");
    expect(settings.indent).toBe(false);
  });

  it("follow the system theme until the writer picks one, and keep an old dark choice", () => {
    const fresh = loadSettings(memoryStorage());
    const old = loadSettings(
      memoryStorage({ "penna.writing": JSON.stringify({ darkTheme: true }) }),
    );
    const picked = loadSettings(
      memoryStorage({ "penna.writing": JSON.stringify({ theme: "ljust" }) }),
    );

    expect([fresh.theme, old.theme, picked.theme]).toEqual(["system", "mörkt", "ljust"]);
  });

  it("have spelling and Swedish typography on from the start", () => {
    const settings = loadSettings(memoryStorage());

    expect(settings).toMatchObject({ spellcheck: true, typography: true });
  });

  it("survive storage that is broken or blocked", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };

    expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(broken, DEFAULT_SETTINGS)).not.toThrow();
  });

  it("keep the text size within readable limits", () => {
    expect(changeSize(DEFAULT_SETTINGS, 1).size).toBe(20);
    expect(changeSize({ ...DEFAULT_SETTINGS, size: 28 }, 1).size).toBe(28);
    expect(changeSize({ ...DEFAULT_SETTINGS, size: 14 }, -1).size).toBe(14);
  });

  it("step through the line heights and start over", () => {
    expect(nextLineHeight(1.8)).toBe(2);
    expect(nextLineHeight(2)).toBe(1.5);
  });

  it("turn into CSS for the manuscript", () => {
    const style = proseStyle({ ...DEFAULT_SETTINGS, font: "mono", width: "bred", indent: false });

    expect(style["--prose-font"]).toContain("Geist Mono");
    expect(style["--prose-width"]).toBe("720px");
    expect(style["--prose-indent"]).toBe("0");
  });
});

describe("sentenceRange", () => {
  const text = "Hon satte sig. Utanför fönstret låg isen. Fyren blinkade.";

  it("finds the sentence around the cursor", () => {
    const range = sentenceRange(text, 20);

    expect(text.slice(range.from, range.to).trim()).toBe("Utanför fönstret låg isen.");
  });

  it("finds the last sentence when the cursor is at the end", () => {
    const range = sentenceRange(text, text.length);

    expect(text.slice(range.from, range.to).trim()).toBe("Fyren blinkade.");
  });
});

describe("typewriterScrollDelta", () => {
  it("scrolls so the line being written sits at the same height", () => {
    const delta = typewriterScrollDelta({ caretTop: 700, viewTop: 100, viewHeight: 800 });

    expect(delta).toBe(700 - (100 + 800 * 0.45));
  });
});
