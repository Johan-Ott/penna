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
  await page.getByRole("button", { name: "Insikter", exact: true }).click();
  await page.locator(".insight-day").click();
  await expect(page.getByRole("dialog", { name: "Dagens mål" })).toContainText("Köket");
});

test("Mål under the day's words shows the scene and chapter, and keeps a goal for the chapter", async ({
  page,
}) => {
  await page.locator(".day-progress").click();
  const goals = page.getByRole("region", { name: "Mål" });
  await expect(goals).toContainText("Scenen");
  await goals.getByRole("textbox", { name: "Mål för Kapitel 1" }).fill("3000");
  await goals.getByRole("textbox", { name: "Mål för Kapitel 1" }).press("Enter");
  await page.getByRole("button", { name: "Stäng" }).last().click();

  await page.locator(".day-progress").click();

  await expect(page.getByRole("textbox", { name: "Mål för Kapitel 1" })).toHaveValue("3000");
});
