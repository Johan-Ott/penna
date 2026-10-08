import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("reaching the daily goal is celebrated, and the ink shows in the journey", async ({
  page,
}) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: 520 }, () => "ord").join(" ")}`);

  await expect(page.getByRole("status").getByText("Dagens sida är skriven.")).toBeVisible();
  await page.locator(".day-progress").click();
  await page.locator(".insight-journey").click();
  const journey = page.getByRole("dialog", { name: "Skrivarresan" });
  await expect(journey.getByText("520 ord sedan du började.", { exact: false })).toBeVisible();
  await expect(page.locator(".insight-journey")).toContainText("75 bläck");
});

test("holiday mode is turned on from the inkwell", async ({ page }) => {
  await page.locator(".day-progress").click();
  await page.locator(".insight-journey").click();
  await page.getByRole("button", { name: "Slå på semesterläge" }).click();

  await expect(page.getByRole("button", { name: /Semesterläge på/ })).toBeVisible();
});
