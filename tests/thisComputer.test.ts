import { describe, expect, it } from "vitest";
import { isMacUserAgent } from "../src/thisComputer";

const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120.0.0.0";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36";

describe("isMacUserAgent", () => {
  it("knows a Mac", () => {
    expect(isMacUserAgent(MAC)).toBe(true);
  });

  it("knows a Windows computer", () => {
    expect(isMacUserAgent(WINDOWS)).toBe(false);
  });

  it("knows an Android phone", () => {
    expect(isMacUserAgent(ANDROID)).toBe(false);
  });
});
