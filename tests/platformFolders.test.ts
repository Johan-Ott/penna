import { describe, expect, it } from "vitest";
import { androidSdk, appFolders } from "../scripts/platformFolders.mjs";

const WINDOWS_ENV = { APPDATA: "/roaming", LOCALAPPDATA: "/local" };

describe("appFolders", () => {
  it("names both folders Windows keeps an app's files in", () => {
    const folders = appFolders("win32", WINDOWS_ENV, "/home/johan", "se.penna.test");

    expect(folders).toEqual(["/roaming/se.penna.test", "/local/se.penna.test"]);
  });

  it("names the macOS folder that holds the WebView's localStorage", () => {
    const folders = appFolders("darwin", {}, "/Users/johan", "se.penna.test");

    expect(folders).toContain("/Users/johan/Library/WebKit/se.penna.test");
  });

  it("names the macOS folder that holds the books and settings", () => {
    const folders = appFolders("darwin", {}, "/Users/johan", "se.penna.test");

    expect(folders).toContain("/Users/johan/Library/Application Support/se.penna.test");
  });

  it("says so when the computer is not one Penna is built for", () => {
    const ask = () => appFolders("linux", {}, "/home/johan", "se.penna.test");

    expect(ask).toThrow(/linux/);
  });
});

describe("androidSdk", () => {
  it("finds the SDK where Android Studio puts it on macOS", () => {
    const sdk = androidSdk("darwin", {}, "/Users/johan");

    expect(sdk).toBe("/Users/johan/Library/Android/sdk");
  });

  it("finds the SDK where Android Studio puts it on Windows", () => {
    const sdk = androidSdk("win32", WINDOWS_ENV, "/home/johan");

    expect(sdk).toBe("/local/Android/Sdk");
  });
});
