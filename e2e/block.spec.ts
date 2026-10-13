import { expect, test } from "@playwright/test";
import type { platform as appPlatform } from "../src/app/platform";
import { openExample } from "./helpers";

const BOOK = "/Användare/Elin/Dokument/Penna/Vintervägen.penna";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

test("Kladdlapp keeps its thoughts in the book's folder", async ({ page }) => {
  await page.getByRole("button", { name: "Kladdlapp", exact: true }).click();
  await page.getByRole("textbox", { name: "Kladdlapp" }).fill("Kolla årtalet på fyren.");

  await expect
    .poll(() =>
      page.evaluate(async (dir) => {
        const url = "/src/app/platform.ts";
        const { platform } = (await import(url)) as { platform: typeof appPlatform };
        return platform.fileSystem.readText(`${dir}/kladdlapp.md`).catch(() => "");
      }, BOOK),
    )
    .toBe("Kolla årtalet på fyren.");
});

test("I scenen lists who is named in the scene, and opens a note beside the text", async ({
  page,
}) => {
  await page.getByRole("button", { name: "I scenen", exact: true }).click();
  const block = page.getByRole("region", { name: "I scenen" });
  await expect(block).toContainText("Elin");
  await expect(block).toContainText("Arvid");

  await block.getByRole("button", { name: /Arvid/ }).click();

  await expect(page.locator(".beside-pane")).toContainText("Arvid");
});

test("a layout keeps which panels are open, and brings them back", async ({ page }) => {
  await page.getByRole("button", { name: "Kladdlapp", exact: true }).click();
  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await page.getByRole("button", { name: "Kladdlapp", exact: true }).click();
  await expect(page.getByRole("region", { name: "Kladdlapp" })).toBeHidden();

  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitem", { name: "Layout 1", exact: true }).click();

  await expect(page.getByRole("region", { name: "Kladdlapp" })).toBeVisible();
});
