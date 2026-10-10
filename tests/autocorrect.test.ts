import { describe, expect, it } from "vitest";
import { isOneStep } from "../src/editor/autocorrect";

describe("isOneStep", () => {
  it("knows a swapped, missing, extra or changed letter", () => {
    expect(isOneStep("ohc", "och")).toBe(true);
    expect(isOneStep("kökt", "köket")).toBe(true);
    expect(isOneStep("brevett", "brevet")).toBe(true);
    expect(isOneStep("brevat", "brevet")).toBe(true);
  });

  it("leaves words two steps apart, or the same word", () => {
    expect(isOneStep("brvt", "brevet")).toBe(false);
    expect(isOneStep("och", "och")).toBe(false);
  });
});
