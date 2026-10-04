import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import ENGLISH from "../src/i18n/en.json";
import { setUiLanguage, t } from "../src/i18n/i18n";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// Every `t("…")` in the app, read straight from the source as a reviewer would.
const TRANSLATED = /\bt\(\s*"((?:[^"\\]|\\.)*)"/g;
const usedTexts = sourceFiles("src").flatMap((path) =>
  [...readFileSync(path, "utf8").matchAll(TRANSLATED)].map((match) =>
    JSON.parse(`"${match[1] ?? ""}"`),
  ),
);

afterEach(() => setUiLanguage("sv"));

describe("t", () => {
  it("shows the Swedish text as written, and fills in the values", () => {
    expect(t("Ny scen")).toBe("Ny scen");
    expect(t("{count} ord", { count: 12 })).toBe("12 ord");
  });

  it("shows the English text when English is chosen", () => {
    setUiLanguage("en");

    expect(t("Ny scen")).toBe("New scene");
    expect(t("{count} ord", { count: 12 })).toBe("12 words");
  });

  it("has English for every text the app asks to translate", () => {
    const missing = [...new Set(usedTexts)].filter((text) => !(text in ENGLISH));

    expect(missing).toEqual([]);
  });

  it("keeps no English for texts the app no longer uses", () => {
    const used = new Set(usedTexts);

    expect(Object.keys(ENGLISH).filter((text) => !used.has(text))).toEqual([]);
  });
});
