import { describe, expect, it } from "vitest";
import { syncProject } from "../src/sync/driveSync";
import { readSyncLog, treeChanges } from "../src/sync/syncLog";
import { BOOK, twoDevices } from "./fakeDrive";

const NOW = Date.parse("2026-10-04T12:00:00Z");
const sync = (
  device: Parameters<typeof syncProject>[0],
  cloud: ReturnType<typeof twoDevices>["cloud"],
) => syncProject(device, cloud.drive, BOOK, { now: NOW });

async function synced() {
  const devices = twoDevices();
  await sync(devices.computer, devices.cloud);
  await sync(devices.phone, devices.cloud);
  return devices;
}

describe("the sync log", () => {
  it("keeps the text before and after for a scene changed on the other device", async () => {
    const { cloud, computer } = await synced();
    await cloud.writeAt("Penna/Isen.penna/scenes/S1.md", "Brevet låg på bordet.");

    await sync(computer, cloud);

    expect((await readSyncLog(computer, BOOK)).files).toEqual([
      {
        path: "scenes/S1.md",
        kind: "changed",
        before: "Brevet låg där.",
        after: "Brevet låg på bordet.",
      },
    ]);
  });

  it("lists a new scene and a removed one, and where the removed one went", async () => {
    const { cloud, computer, phone } = await synced();
    await phone.writeText(`${BOOK}/scenes/S2.md`, "Ny scen.");
    await sync(phone, cloud);
    await sync(computer, cloud);
    await phone.rename(`${BOOK}/scenes/S1.md`, `${BOOK}/trash/S1.md`);
    await sync(phone, cloud);

    await sync(computer, cloud);

    const { files } = await readSyncLog(computer, BOOK);
    expect(files.map((file) => [file.path, file.kind])).toEqual([
      ["scenes/S2.md", "added"],
      ["scenes/S1.md", "removed"],
    ]);
    expect(files[1]?.trashPath).toBe("trash/S1.md");
  });

  it("keeps a structure conflict to choose from", async () => {
    const { cloud, computer, phone } = await synced();
    const project = (title: string) =>
      JSON.stringify({ tree: [{ id: "K1", kind: "chapter", title, children: [] }] });
    await computer.writeText(`${BOOK}/project.json`, project("Fyren"));
    await sync(computer, cloud);
    await sync(phone, cloud);
    await phone.writeText(`${BOOK}/project.json`, project("Fyrvaktaren"));
    await sync(phone, cloud);

    await computer.writeText(`${BOOK}/project.json`, project("Ljuset"));
    await sync(computer, cloud);

    const { conflicts } = await readSyncLog(computer, BOOK);
    expect(conflicts).toMatchObject([
      { id: "K1", field: "title", here: "Ljuset", drive: "Fyrvaktaren" },
    ]);
  });
});

describe("treeChanges", () => {
  it("names what was added, removed, moved and renamed", () => {
    const before = [
      {
        id: "K1",
        kind: "chapter" as const,
        title: "Brevet",
        children: [{ id: "S1", kind: "scene" as const }],
      },
      { id: "K2", kind: "chapter" as const, title: "Fyren", children: [] },
    ];
    const after = [
      { id: "K1", kind: "chapter" as const, title: "Breven", children: [] },
      {
        id: "K3",
        kind: "chapter" as const,
        title: "Isen",
        children: [{ id: "S1", kind: "scene" as const }],
      },
    ];

    expect(
      treeChanges(before, after).map((change) => [change.kind, change.node.id, change.field]),
    ).toEqual([
      ["removed", "K2", undefined],
      ["changed", "K1", "title"],
      ["added", "K3", undefined],
      ["moved", "S1", undefined],
    ]);
  });
});
