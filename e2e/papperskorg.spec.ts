import { expect, test, type Page } from "@playwright/test";
import { openExample, sidebar, treeRow } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openExample(page);
});

const rowNames = (page: Page) => sidebar(page).locator(".tree-row .tree-label").allInnerTexts();

test("a scene thrown away from the menu can be taken back at once, to where it was", async ({
  page,
}) => {
  const before = await rowNames(page);
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();

  await page.getByRole("status").getByRole("button", { name: "Ångra" }).click();

  await expect.poll(() => rowNames(page)).toEqual(before);
});

test("a scene dragged onto Personer stays in the book", async ({ page }) => {
  const before = await rowNames(page);

  await treeRow(page, "Isen").dragTo(treeRow(page, "Personer"));

  await expect.poll(() => rowNames(page)).toEqual(before);
});
