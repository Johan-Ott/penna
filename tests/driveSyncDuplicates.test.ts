import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { BOOK, twoDevices } from "./fakeDrive";
import type { Drive } from "../src/sync/drive";

const NOW = Date.parse("2026-10-04T12:00:00Z");
const bytes = (text: string) => new TextEncoder().encode(text);

// The book's folder in Drive, and its scenes folder, as two devices racing would find them.
async function folders(drive: Drive) {
  const app = (await drive.findFolder("Skrivro", null)) ?? "";
  const book = (await drive.findFolder("Isen.skrivro", app)) ?? "";
  return { book, scenes: (await drive.findFolder("scenes", book)) ?? "" };
}

const textsIn = async (
  files: { list(dir: string): Promise<string[]>; readText(path: string): Promise<string> },
  dir: string,
) => Promise.all((await files.list(dir)).map((name) => files.readText(`${dir}/${name}`)));

describe("two files or folders of the same name in Drive", () => {
  it("keeps both texts of a scene uploaded twice, one of them as a conflict copy", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const { scenes } = await folders(cloud.drive);
    await cloud.drive.upload("S1.md", scenes, bytes("Skrivet på telefonen."));

    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    const texts = await textsIn(phone, `${BOOK}/scenes`);
    expect(texts).toEqual(expect.arrayContaining(["Brevet låg där.", "Skrivet på telefonen."]));
  });

  it("puts a second copy with the same text in Drive's trash, and tells no conflict", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const { scenes } = await folders(cloud.drive);
    await cloud.drive.upload("S1.md", scenes, bytes("Brevet låg där."));

    const result = await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    expect(result.conflicts).toEqual([]);
    expect((await cloud.drive.list(scenes)).filter((file) => file.name === "S1.md")).toHaveLength(
      1,
    );
  });

  it("reads the scenes in both of two folders with the same name", async () => {
    const { cloud, computer, phone } = twoDevices();
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const { book } = await folders(cloud.drive);
    const second = await cloud.drive.createFolder("scenes", book);
    await cloud.drive.upload("S2.md", second, bytes("Isen bar."));

    await syncProject(phone, cloud.drive, BOOK, { now: NOW });

    expect(await phone.readText(`${BOOK}/scenes/S2.md`)).toBe("Isen bar.");
  });

  it("merges a second project.json into the book instead of losing its chapters", async () => {
    const { cloud, computer } = twoDevices();
    await computer.writeText(
      `${BOOK}/project.json`,
      '{"title":"Isen","tree":[{"id":"K1","kind":"chapter","title":"Brevet","children":[]}]}',
    );
    await syncProject(computer, cloud.drive, BOOK, { now: NOW });
    const { book } = await folders(cloud.drive);
    await cloud.drive.upload(
      "project.json",
      book,
      bytes('{"title":"Isen","tree":[{"id":"K2","kind":"chapter","title":"Fyren","children":[]}]}'),
    );

    await syncProject(computer, cloud.drive, BOOK, { now: NOW });

    const project = await computer.readText(`${BOOK}/project.json`);
    expect(project).toContain("Brevet");
    expect(project).toContain("Fyren");
  });
});
