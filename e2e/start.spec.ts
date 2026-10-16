import { expect, test } from "@playwright/test";
import { editor } from "./helpers";

test("the first start goes to the shelf, where a new book opens a scene to write in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Kom igång" })).toBeVisible({ timeout: 50_000 });
  await page.getByRole("button", { name: "Kom igång" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("radio", { name: "Annat" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Isen");
  await page.getByRole("button", { name: "Skapa" }).click();
  await editor(page).click();
  await page.keyboard.type("Det var kallt.");

  await expect(editor(page)).toHaveText("Det var kallt.");
  await expect(page.locator(".sidebar")).toContainText("Isen");
});
