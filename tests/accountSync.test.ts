import { describe, expect, it } from "vitest";
import { syncAccount, type Account } from "../src/sync/accountSync";
import { createFakeDrive } from "./fakeDrive";

const account = (changedAt: number, name: string): Account => ({
  changedAt,
  profile: { about: `Om ${name}`, link: "", picture: "", frame: "", title: "" },
  settings: { authorName: name, defaultDailyGoal: 500, isAutoSnapshotOn: true },
});

describe("syncAccount", () => {
  it("puts the first device's account in Skrivro/konto.json, and gives it to the next", async () => {
    const cloud = createFakeDrive();

    expect(await syncAccount(cloud.drive, account(100, "Elin"))).toBeNull();
    const taken = await syncAccount(cloud.drive, account(0, ""));

    expect(cloud.textAt("Skrivro/konto.json")).toContain('"authorName": "Elin"');
    expect(taken?.settings.authorName).toBe("Elin");
  });

  it("sends what was changed here last, and leaves an older change in Drive behind", async () => {
    const cloud = createFakeDrive();
    await syncAccount(cloud.drive, account(100, "Elin"));

    expect(await syncAccount(cloud.drive, account(200, "Maja"))).toBeNull();
    const taken = await syncAccount(cloud.drive, account(150, "Arvid"));

    expect(taken?.settings.authorName).toBe("Maja");
  });

  it("does nothing when both sides have the same change", async () => {
    const cloud = createFakeDrive();
    await syncAccount(cloud.drive, account(100, "Elin"));

    expect(await syncAccount(cloud.drive, account(100, "Elin"))).toBeNull();
    expect(cloud.textAt("Skrivro/konto.json")).toContain('"changedAt": 100');
  });
});
