import { expect, test, type Page } from "@playwright/test";
import type { platform as appPlatform } from "../src/app/platform";
import { openExample } from "./helpers";

const BOOK = "/Användare/Elin/Dokument/Penna/Vintervägen.penna";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

const notesFile = (page: Page) =>
  page.evaluate(async (dir) => {
    const url = "/src/app/platform.ts";
    const { platform } = (await import(url)) as { platform: typeof appPlatform };
    return platform.fileSystem.readText(`${dir}/lappar.json`).catch(() => "[]");
  }, BOOK);

test("Lappar are written in and drawn on, and kept in the book's folder", async ({ page }) => {
  await page.getByRole("button", { name: "Lappar", exact: true }).click();
  const note = page.getByRole("region", { name: "Lapp" });
  await note.getByRole("textbox", { name: "Lappens text" }).fill("Kolla årtalet på fyren.");
  await note.getByRole("button", { name: "Rosa" }).click();
  await note.getByRole("button", { name: "Rita" }).click();
  const box = (await note.locator(".note-drawing").boundingBox()) ?? { x: 0, y: 0 };
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 60, { steps: 5 });
  await page.mouse.up();

  await expect
    .poll(async () => JSON.parse(await notesFile(page))[0]?.text)
    .toBe("Kolla årtalet på fyren.");
  const [saved] = JSON.parse(await notesFile(page)) as { color: string; strokes: unknown[] }[];
  expect(saved?.color).toBe("rosa");
  expect(saved?.strokes).toHaveLength(1);
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
  await page.getByRole("button", { name: "I scenen", exact: true }).click();
  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await page.getByRole("button", { name: "I scenen", exact: true }).click();
  await expect(page.getByRole("region", { name: "I scenen" })).toBeHidden();

  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitemradio", { name: "Layout 1" }).click();

  await expect(page.getByRole("region", { name: "I scenen" })).toBeVisible();
});

test("a layout with Insikter brings it back after the sprint was opened", async ({ page }) => {
  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await expect(page.locator(".insights-head")).toBeVisible();
  await page.getByRole("button", { name: "Layouter" }).click();
  await page.getByRole("menuitem", { name: "Spara som layout 1" }).click();
  await page.getByRole("button", { name: "Skrivsprint" }).first().click();

  await page.getByRole("button", { name: /^Layouter/ }).click();
  await page.getByRole("menuitemradio", { name: "Layout 1" }).click();

  await expect(page.locator(".insights-head")).toBeVisible();
  await expect(page.getByRole("region", { name: "Skrivsprint" })).toBeHidden();
});
