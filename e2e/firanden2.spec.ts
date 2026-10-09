import { expect, test, type Page } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

const writeWords = async (page: Page, count: number) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: count }, () => "ord").join(" ")}`);
};

test("Dela on a celebration opens Studio on the week, and Dagens mål lists the text", async ({
  page,
}) => {
  await writeWords(page, 520);
  const toast = page.getByRole("status").filter({ hasText: "Dagens sida är skriven." });
  await toast.getByRole("button", { name: "Dela" }).click();

  await expect(page.getByRole("button", { name: /Veckan i siffror/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "← Publicera" }).click();
  await page.getByRole("button", { name: /Tillbaka till texten/ }).click();
  await page.locator(".day-progress").click();
  await page.locator(".insight-day").click();
  await expect(page.getByRole("dialog", { name: "Dagens mål" })).toContainText("Köket");
});
