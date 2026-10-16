import { describe, expect, it } from "vitest";
import { shortcutText } from "../src/app/shortcutKeys";

describe("shortcutText", () => {
  it("names the keys Windows writes on", () => {
    const text = shortcutText({ key: "f", shift: true }, false);

    expect(text).toBe("Ctrl+Shift+F");
  });

  it("names the keys a Mac writes on", () => {
    const text = shortcutText({ key: "f", shift: true }, true);

    expect(text).toBe("⇧⌘F");
  });

  it("puts Option first on a Mac, in the order the system writes it", () => {
    const text = shortcutText({ key: "f", alt: true }, true);

    expect(text).toBe("⌥⌘F");
  });

  it("writes a named key in full", () => {
    const text = shortcutText({ key: "enter", shift: true }, true);

    expect(text).toBe("⇧⌘Enter");
  });
});
