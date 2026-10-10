import { expect, test } from "@playwright/test";
import { editor } from "./helpers";

test("the first start makes a new book and opens a scene to write in", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Välkommen till Penna.")).toBeVisible({ timeout: 50_000 });

  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByRole("radio", { name: /Annat/ }).click();
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Isen");
  await page.getByRole("button", { name: "Skapa boken" }).click();
  await page.getByRole("button", { name: "Börja skriva" }).click();
  await page.keyboard.type("Det var kallt.");

  await expect(editor(page)).toHaveText("Det var kallt.");
  await expect(page.locator(".sidebar")).toContainText("Isen");
});
