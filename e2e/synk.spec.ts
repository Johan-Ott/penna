import { expect, test, type Page } from "@playwright/test";
import type { platform as appPlatform } from "../src/app/platform";
import { openExample } from "./helpers";

const BOOK = "/Användare/Elin/Dokument/Penna/Vintervägen.penna";

// What a sync would have left: a changed scene, and a chapter renamed two ways.
async function leaveSyncLog(page: Page) {
  await page.evaluate(async (dir) => {
    // The page's own module, as the dev server serves it to the app.
    const url = "/src/app/platform.ts";
    const { platform } = (await import(url)) as { platform: typeof appPlatform };
    const scene = `${dir}/scenes/01J9Z4K2QX0000000000000001.md`;
    const before = await platform.fileSystem.readText(scene);
    await platform.fileSystem.writeText(scene, before.replace("kylan", "snön"));
    const chapter = { id: "01J9Z4K2QX00000000000000C3", kind: "chapter", title: "Smältningen" };
    const log = {
      files: [
        {
          path: "scenes/01J9Z4K2QX0000000000000001.md",
          kind: "changed",
          before,
          after: before.replace("kylan", "snön"),
        },
      ],
      nodes: [],
      conflicts: [
        {
          id: chapter.id,
          field: "title",
          here: "Smältningen",
          drive: "Islossningen",
          node: chapter,
        },
      ],
    };
    await platform.fileSystem.writeText(`${dir}/.penna-sync-log.json`, JSON.stringify(log));
  }, BOOK);
}

test("what the sync brought is shown side by side, and a conflict is chosen", async ({ page }) => {
  await openExample(page);
  await leaveSyncLog(page);
  await page.keyboard.press("Control+Shift+O");
  await page.getByText("Vintervägen").first().click();

  await page.getByRole("button", { name: "Från synken: 2 att se över" }).click();
  const view = page.locator(".sync-view");
  await view.getByRole("button", { name: /Köket/ }).click();
  await expect(view.locator("ins")).toContainText("snön");
  await view.getByRole("button", { name: "Ta tillbaka min" }).click();
  await expect(page.locator(".ProseMirror")).toContainText("in från kylan");
  await view.getByRole("button", { name: /Smältningen: titeln/ }).click();
  await view.getByRole("button", { name: "Behåll Drives" }).click();

  await expect(page.locator(".sidebar")).toContainText("Islossningen");
  await view.getByRole("button", { name: "Klart" }).click();
  await expect(page.getByRole("button", { name: /Från synken/ })).toBeHidden();
  await expect(page.locator(".ProseMirror")).toBeVisible();
});

test("the phone shows what the sync brought too", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExample(page);
  await leaveSyncLog(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
  await page.getByText("Vintervägen").first().click();

  await page.getByRole("button", { name: "Från synken: 2 att se över" }).click();
  await page.getByRole("button", { name: "Behåll Drives" }).click();
  await page.getByRole("button", { name: "Godta" }).click();

  await expect(page.locator(".sync-view")).toContainText("Inget nytt från synken.");
});
