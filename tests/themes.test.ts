import { describe, expect, it } from "vitest";
import {
  START_OWN,
  bookTheme,
  contrast,
  isDarkTheme,
  mix,
  themeFileText,
  themeFrom,
  themeTokens,
} from "../src/project/themes";

describe("themes", () => {
  it("reads a ready theme by its id and an own theme by its colours, and nothing else", () => {
    expect(bookTheme({ theme: { id: "skrack" } })?.accent).toBe("#a83232");
    expect(
      bookTheme({ theme: { background: "#ffffff", text: "#111111", accent: "#3f6b4e" } })?.id,
    ).toBe("eget");
    expect(bookTheme({ theme: { background: "vit" } })).toBeNull();
    expect(bookTheme({})).toBeNull();
  });

  it("works out the app's tokens from three colours, dark for a dark background", () => {
    const night = themeTokens({ ...START_OWN, background: "#121212", text: "#ededed" });

    expect(themeTokens(START_OWN)["--bg"]).toBe("#f3efe6");
    expect(isDarkTheme({ ...START_OWN, background: "#121212" })).toBe(true);
    expect(night["--surface-selected"]).toBe(mix("#121212", "#ededed", 0.12));
  });

  it("measures contrast as WCAG does", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("keeps a theme the same through a .pennatema file", () => {
    expect(themeFrom(JSON.parse(themeFileText(START_OWN)))).toEqual(START_OWN);
  });
});
