import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

async function openThemes(page: Page) {
  await page.locator(".book-title-menu").click();
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
