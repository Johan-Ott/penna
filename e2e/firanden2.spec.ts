import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

const writeWords = async (page: Page, count: number) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: count }, () => "ord").join(" ")}`);
};

test("A celebration shows when the day's goal is met, and Dagens mål lists the text", async ({
  page,
}) => {
  await writeWords(page, 520);
  await expect(
    page.getByRole("status").filter({ hasText: "Dagens sida är skriven." }),
  ).toBeVisible();
  await page.locator(".day-progress").click();
  await expect(page.getByRole("dialog", { name: "Dagens mål" })).toContainText("Köket");
});
