import { expect, test, type Page } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

const sidebar = (page: Page) => page.locator(".sidebar");
const treeRow = (page: Page, name: string) => sidebar(page).getByText(name, { exact: true });

test("a comment is written on the selected words and shown in Granska", async ({ page }) => {
  await selectFirstWord(page);

  await page.keyboard.press("Control+Shift+m");
  await page.keyboard.type("Ska brevet vara gult?");
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();

  await expect(page.getByText("Ska brevet vara gult?")).toBeVisible();
  await expect(editor(page).locator(".commented")).toHaveCount(1);
});

test("a scene is renamed from its menu in the tree", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });

  await page.getByRole("menuitem", { name: "Byt namn" }).click();
  await page.keyboard.press("Control+a");
  await page.keyboard.type("Isen bär");
  await page.keyboard.press("Enter");

  await expect(treeRow(page, "Isen bär")).toBeVisible();
});

test("the book's heading in the tree shows all its words", async ({ page }) => {
  await expect(sidebar(page).getByLabel("Ord i boken")).toHaveText("239");
});

test("the tree folds and unfolds all, and unfolds to a scene opened from the palette", async ({
  page,
}) => {
  await sidebar(page)
    .locator(".tree")
    .click({ button: "right", position: { x: 100, y: 5 } });
  await page.getByRole("menuitem", { name: "Fäll ihop alla" }).click();
  await expect(treeRow(page, "Isen")).toBeHidden();

  await page.keyboard.press("Control+k");
  await page.keyboard.type("Isen");
  await page.keyboard.press("Enter");
  await expect(treeRow(page, "Isen")).toBeVisible();

  await sidebar(page)
    .locator(".tree")
    .click({ button: "right", position: { x: 100, y: 5 } });
  await page.getByRole("menuitem", { name: "Fäll ut alla" }).click();
  await expect(treeRow(page, "Regnet")).toBeVisible();
});

test("a chapter clicked opens its first scene", async ({ page }) => {
  await treeRow(page, "2. Fyren").click();

  await expect(editor(page)).toContainText("Arvid hade inte varit uppe i fyren");
});

test("a scene thrown away can be put back in the manuscript", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Flytta till papperskorg" }).click();
  await treeRow(page, "Papperskorg").click();
  await treeRow(page, "Isen").click({ button: "right" });

  await page.getByRole("menuitem", { name: "Lägg tillbaka i manuset" }).click();

  await expect(treeRow(page, "Isen")).toBeVisible();
  await expect(page.locator(".sidebar")).not.toContainText("Papperskorg1");
});

test("a name in the text opens the person's card", async ({ page }) => {
  await editor(page).locator(".mention").first().click();

  await expect(page.getByRole("dialog").getByText("Elin")).toBeVisible();
});

test("a scene is split at the cursor, the rest becoming a new scene after it", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.press("Control+Shift+Enter");

  await expect(editor(page)).toContainText("Brevet låg på köksbordet");
  await expect(editor(page)).not.toContainText("Det kom i morse");
  await expect(sidebar(page).getByText("Köket")).toHaveCount(2);
});

test("replace all changes every match in the scene and Ångra takes it back", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("Control+f");
  await page.keyboard.type("isen");
  await page.getByRole("textbox", { name: "Ersätt med" }).fill("snön");

  await page.getByRole("button", { name: "Alla", exact: true }).click();
  await expect(editor(page)).toContainText("hade snön lagt sig");
  await page.getByRole("button", { name: "Ångra" }).click();

  await expect(editor(page)).toContainText("hade isen lagt sig");
});
