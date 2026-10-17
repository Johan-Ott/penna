import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import KIT_ENGLISH from "../llkit/en.json";
import ENGLISH from "../src/i18n/en.json";
import { setUiLanguage, t } from "../src/i18n/i18n";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

// Every `t("…")` in the app, read straight from the source as a reviewer would. A text with
// quotes in it is written t('…').
const TRANSLATED = /\bt\(\s*(?:"((?:[^"\\]|\\.)*)"|'([^'\\]*)')/g;
const textsIn = (dir: string) =>
  sourceFiles(dir).flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(TRANSLATED)].map(
      (match) => match[2] ?? JSON.parse(`"${match[1] ?? ""}"`),
    ),
  );
const usedTexts = textsIn("src");
const kitTexts = textsIn("llkit");

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
    const known = (text: string) => text in ENGLISH || text in KIT_ENGLISH;

    expect([...new Set(usedTexts)].filter((text) => !known(text))).toEqual([]);
  });

  it("keeps llkit's texts in llkit, since llkit knows nothing of the app", () => {
    expect([...new Set(kitTexts)].filter((text) => !(text in KIT_ENGLISH))).toEqual([]);
    expect(Object.keys(KIT_ENGLISH).filter((text) => !kitTexts.includes(text))).toEqual([]);
  });

  it("keeps no English for texts the app no longer uses", () => {
    const used = new Set(usedTexts);

    expect(Object.keys(ENGLISH).filter((text) => !used.has(text))).toEqual([]);
  });
});
