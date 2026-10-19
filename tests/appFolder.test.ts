import { describe, expect, it } from "vitest";
import { appFolder, type Drive } from "../src/sync/drive.js";

// Only the folder calls matter here; the rest of Drive is never reached.
const driveWith = (folders: string[]) => {
  const made: string[] = [];
  const drive = {
    findFolder: async (name: string) => (folders.includes(name) ? `id-${name}` : null),
    createFolder: async (name: string) => (made.push(name), `id-${name}`),
  } as unknown as Drive;
  return { drive, made };
};

describe("appFolder", () => {
  it("keeps using Penna/ where an earlier version put the books", async () => {
    const { drive, made } = driveWith(["Penna"]);
    expect(await appFolder(drive)).toBe("id-Penna");
    expect(made).toEqual([]);
  });

  it("makes Skrivro/ when there is neither", async () => {
    const { drive, made } = driveWith([]);
    expect(await appFolder(drive)).toBe("id-Skrivro");
    expect(made).toEqual(["Skrivro"]);
  });
});
