import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
  await runCommand(page, "Gå till Innehåll");
});

test("a chapter folds out to its scenes, each with its own Vad händer?", async ({ page }) => {
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  const scenes = page.locator(".contents-row.scene");
  await expect(scenes).toHaveCount(2);
  await expect(scenes.first()).toContainText("Köket");

  const summary = scenes.first().getByRole("textbox", { name: "Vad händer?" });
  await summary.fill("Elin hittar brevet.");
  await summary.press("Enter");
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  await expect(
    page.locator(".contents-row.scene").first().getByRole("textbox", { name: "Vad händer?" }),
  ).toHaveValue("Elin hittar brevet.");
});

test("a scene dragged onto another chapter moves into it", async ({ page }) => {
  await page.getByRole("button", { name: "Scener i Brevet" }).click();
  const isen = page.locator(".contents-row.scene", { hasText: "Isen" });
  const fyren = page.locator(".contents-row:not(.scene)", { hasText: "Fyren" }).first();
  await isen.dragTo(fyren);

  await page.getByRole("button", { name: "Scener i Fyren" }).click();
  await expect(page.locator(".contents-row.scene", { hasText: "Isen" })).toHaveCount(1);
  await expect(page.locator(".tree")).toContainText(/2\. Fyren[\s\S]*Isen/);
});
