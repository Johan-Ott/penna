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
  await page.getByRole("treeitem").filter({ hasText: "Elin" }).click();
  await expect(editor(page)).toContainText("Trettioåtta");

  await page.evaluate(() => history.back());

  await expect(page.getByRole("treeitem").filter({ hasText: "Arvid" })).toBeVisible();
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

test("the tabs go to Innehåll and Publicera, and back to Boken", async ({ page }) => {
  await page.getByRole("button", { name: "Innehåll" }).click();
  await expect(page.locator(".contents-view")).toBeVisible();
  await page.getByRole("button", { name: "Publicera" }).click();
  await expect(page.locator(".phone-view")).toContainText(/Exportera|Design/);

  await page.getByRole("button", { name: "Boken" }).click();

  await expect(page.getByRole("button", { name: /Fortsätt skriva/ })).toBeVisible();
});

test("the palette on the phone has no folder to pick", async ({ page }) => {
  await page.getByRole("button", { name: "Sök" }).first().click();
  await page.keyboard.type("mapp");

  await expect(page.getByText("Öppna projektmapp…")).toBeHidden();
});

test("the shelf on the phone has a menu with Inställningar, and no folder to pick", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();

  await page.getByRole("button", { name: "Meny" }).click();
  await expect(page.getByRole("menuitem", { name: "Öppna mapp…" })).toBeHidden();
  await page.getByRole("menuitem", { name: "Inställningar" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("a note is renamed from its menu in the list of its sort", async ({ page }) => {
  await page.getByRole("button", { name: /Personer/ }).click();
  await page.getByRole("button", { name: "Meny för Elin" }).click();

  await expect(page.getByRole("menuitem", { name: "Byt namn" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /papperskorg/i })).toBeVisible();
});

test("a scene in Boken has its menu behind ⋯", async ({ page }) => {
  await page.getByRole("button", { name: "Meny för Köket" }).click();

  await expect(page.getByRole("menuitem", { name: /Ny scen efter/ })).toBeVisible();
});

test("Läs kapitlet reads the chapter on the phone", async ({ page }) => {
  await page.getByRole("button", { name: /Fortsätt skriva/ }).click();
  await page.getByRole("button", { name: "Läs kapitlet" }).click();

  await expect(page.locator(".read-view")).toContainText("Brevet låg på köksbordet");
});
