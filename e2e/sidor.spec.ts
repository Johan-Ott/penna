import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test("page breaks of the printed book show in the text, and Innehåll counts the pages", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("penna.writing", JSON.stringify({ showPages: true })),
  );
  await openExample(page);
  await editor(page).locator("p").first().click();

  await page.evaluate(() => {
    const paragraph = "Isen låg tjock över viken och ingen visste när den skulle släppa. ".repeat(
      4,
    );
    for (let index = 0; index < 60; index++) {
      document.execCommand("insertText", false, paragraph);
      document.execCommand("insertParagraph");
    }
  });

  await expect(editor(page).locator(".page-mark").first()).toBeVisible({ timeout: 40_000 });
  await page.keyboard.press("Control+k");
  await page.keyboard.type("Gå till Innehåll");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/\d+ sidor i 130 × 200 mm/)).toBeVisible({ timeout: 40_000 });
});
