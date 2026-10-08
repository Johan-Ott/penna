import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
  await editor(page).click();
  await runCommand(page, "Publicera");
  await page.getByRole("button", { name: /Studio/ }).click();
});

test("Studio draws the week as a picture, and the countdown asks for a release day", async ({
  page,
}) => {
  await expect(page.locator("canvas.studio-card")).toBeVisible();
  await page.getByRole("button", { name: /Nedräkning/ }).click();
  await page.getByLabel("Utgivningsdag").fill("2027-03-12");
  await page.getByLabel("Utgivningsdag").blur();

  await page.getByRole("button", { name: "← Publicera" }).click();
  await page.getByRole("button", { name: /Studio/ }).click();
  await page.getByRole("button", { name: /Nedräkning/ }).click();
  await expect(page.getByLabel("Utgivningsdag")).toHaveValue("2027-03-12");
});

test("a chapter is shown as the newsletter mail it becomes", async ({ page }) => {
  await page.getByRole("button", { name: /Kapitel till nyhetsbrev/ }).click();

  await expect(page.locator(".studio-mail")).toContainText("Brevet låg på köksbordet");
  await expect(page.locator(".studio-mail-subject")).toContainText("Vintervägen: Brevet");
});

test("a milestone is named and kept with the book", async ({ page }) => {
  await page.getByRole("button", { name: /Milstolpe/ }).click();
  await page.getByLabel("Milstolpe").fill("Halvvägs");
  await page.getByLabel("Milstolpe").blur();

  await page.getByRole("button", { name: /Veckan i siffror/ }).click();
  await page.getByRole("button", { name: /Milstolpe/ }).click();
  await expect(page.getByLabel("Milstolpe")).toHaveValue("Halvvägs");
});
