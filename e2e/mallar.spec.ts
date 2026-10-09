import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("pieces are added to a book that exists: its notes, labels and closing chapter", async ({
  page,
}) => {
  await page.locator(".book-title-menu:not(.contents)").click();
  await page.getByRole("menuitem", { name: "Mallar och bitar…" }).click();
  const dialog = page.getByRole("dialog", { name: "Mallar och bitar" });
  await dialog.getByRole("button", { name: "Deckare" }).click();
  await dialog.getByRole("button", { name: "Serie" }).click();
  await dialog.getByRole("button", { name: "Lägg till", exact: true }).click();

  const sidebar = page.locator(".sidebar");
  await expect(sidebar.getByText("Misstänkta", { exact: true })).toBeVisible();
  await expect(sidebar.getByText("Kroken")).toBeVisible();
});
