import { describe, expect, it } from "vitest";
import { isNewer } from "../src/app/versions";

describe("isNewer", () => {
  it("compares each number, so 0.10 is newer than 0.9", () => {
    expect(isNewer("v0.3.0", "0.2.0")).toBe(true);
    expect(isNewer("0.10.0", "0.9.2")).toBe(true);
    expect(isNewer("v0.2.0", "0.2.0")).toBe(false);
    expect(isNewer("0.1.9", "0.2.0")).toBe(false);
  });
});
