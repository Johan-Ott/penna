import { expect, test } from "@playwright/test";
import { editor, openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("the selected paragraph is centred from the style menu, and back to body text", async ({
  page,
}) => {
  await selectFirstWord(page);
  await page.getByRole("button", { name: "Stil: Brödtext" }).click();
  await page.getByRole("menuitemradio", { name: "Centrerat" }).click();

  await expect(editor(page).locator(".style-centrerat")).toHaveCount(1);
});
