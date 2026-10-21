import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
  await page.getByRole("button", { name: "Meny", exact: true }).click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
});

test("a book is made a favourite with its star, and stays one", async ({ page }) => {
  await page.locator(".book").filter({ hasText: "Vintervägen" }).hover();
  await page.getByRole("button", { name: "Lägg till i favoriter" }).click();

  await expect(page.getByRole("button", { name: "Ta bort från favoriter" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Ta bort från favoriter" })).toBeVisible();
});

test("the shelf is sorted by title from Sortera", async ({ page }) => {
  await page.getByRole("button", { name: "Sortera: Senast skrivet" }).click();
  await page.getByRole("menuitemradio", { name: "Titel" }).click();

  await expect(page.getByRole("button", { name: "Sortera: Titel" })).toBeVisible();
});
