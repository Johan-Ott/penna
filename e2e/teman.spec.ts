import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

async function openThemes(page: Page) {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Boken" }).click();
  await page.getByRole("menuitem", { name: "Tema…" }).click();
}

const appColour = (page: Page, token: string) =>
  page
    .locator(".app")
    .evaluate((element, name) => getComputedStyle(element).getPropertyValue(name), token);

test("a ready theme colours the whole app, and Som appen takes it away", async ({ page }) => {
  await openThemes(page);
  await page.getByRole("button", { name: /Skräck/ }).click();

  expect(await appColour(page, "--bg")).toBe("#161414");
  await page.getByRole("button", { name: /Som appen/ }).click();
  expect(await appColour(page, "--bg")).toBe("#ffffff");
});

test("an own theme is made from three colours and warns when the text is hard to read", async ({
  page,
}) => {
  await openThemes(page);
  await page.getByRole("button", { name: /Eget tema/ }).click();
  await page.getByRole("button", { name: "#121212" }).click();

  expect(await appColour(page, "--bg")).toBe("#121212");
  await expect(page.getByText("För låg kontrast")).toBeVisible();
});

test("searching the settings leaves only the rows that hold the word", async ({ page }) => {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Inställningar" }).click();

  await page.getByRole("searchbox", { name: "Sök i inställningarna" }).fill("stav");

  const rows = page.locator(".settings-found .settings-row:visible");
  await expect(rows.first()).toBeVisible();
  for (const text of await rows.allInnerTexts()) expect(text.toLowerCase()).toContain("stav");
});

test("a shortcut is found by searching the settings", async ({ page }) => {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Inställningar" }).click();

  await page.getByRole("searchbox", { name: "Sök i inställningarna" }).fill("fotnot");

  await expect(page.locator(".settings-found .settings-row:visible")).toContainText(["fotnot"]);
});
