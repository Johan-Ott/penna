import { expect, test } from "@playwright/test";
import { editor, openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openExample(page);
});

test("Fortsätt skriva opens the text, and back returns to Boken", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await expect(page.getByRole("button", { name: "Tillbaka" })).toBeVisible();

  await page.evaluate(() => history.back());

  await expect(page.getByRole("button", { name: /Fortsätt skriva/ })).toBeVisible();
});

test("a person opens from the Personer tile, and back returns to the list", async ({ page }) => {
  await page.getByRole("button", { name: /Personer/ }).click();
  await page.getByRole("button", { name: "Elin", exact: true }).click();
  await expect(editor(page)).toContainText("Trettioåtta");

  await page.evaluate(() => history.back());

  await expect(page.getByRole("button", { name: "Arvid", exact: true })).toBeVisible();
});

test("Granska opens over the whole text and closes again", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await page.getByRole("button", { name: /Granska/ }).click();
  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeVisible();
  await page.getByRole("button", { name: "Stäng granskning" }).click();

  await expect(page.getByRole("complementary", { name: "Granskning" })).toBeHidden();
});

test("selecting a word shows the bar with Fotnot", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();

  await selectFirstWord(page);

  await expect(page.getByRole("toolbar", { name: "Markering" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fotnot" })).toBeVisible();
});

test("the palette on the phone offers only what the phone can show", async ({ page }) => {
  await page.getByRole("button", { name: "Sök" }).first().click();
  await page.keyboard.type("Gå till");

  await expect(page.getByText("Gå till Innehåll")).toBeHidden();
  await expect(page.getByText("Öppna projektmapp…")).toBeHidden();
});
