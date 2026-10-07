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

test("a label is made on one scene and ticked only there, and can be removed", async ({ page }) => {
  await treeRow(page, "Köket").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await page.getByRole("menuitem", { name: "Ny label…" }).click();
  const dialog = page.getByRole("dialog", { name: "Status och labels" });
  await dialog.getByRole("textbox", { name: "Ny label" }).fill("Skriv om");
  await dialog.getByRole("button", { name: "Lägg till" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Sätt Skriv om på raden" })).toBeChecked();
  await page.keyboard.press("Escape");

  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Skriv om" })).not.toBeChecked();
  await page.getByRole("menuitem", { name: "Hantera labels…" }).click();
  await expect(dialog.getByRole("checkbox", { name: "Sätt Skriv om på raden" })).not.toBeChecked();
  await dialog.getByRole("button", { name: "Ta bort Skriv om" }).click();

  await expect(dialog.getByText("Boken har inga labels än.")).toBeVisible();
});

test("a labelled scene shows its dot, and the filter keeps only it and its chapter", async ({
  page,
}) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await page.getByRole("menuitem", { name: "Ny label…" }).click();
  const dialog = page.getByRole("dialog", { name: "Status och labels" });
  await dialog.getByRole("textbox", { name: "Ny label" }).fill("Skriv om");
  await dialog.getByRole("button", { name: "Lägg till" }).click();
  await page.keyboard.press("Escape");
  await expect(sidebar(page).locator('.tree-dot[title="Skriv om"]')).toHaveCount(1);

  await sidebar(page).getByRole("button", { name: "Filtrera" }).click();
  await page.getByRole("menuitemradio", { name: "Skriv om" }).click();

  await expect(treeRow(page, "Isen")).toBeVisible();
  await expect(treeRow(page, "1. Brevet")).toBeVisible();
  await expect(treeRow(page, "Köket")).toBeHidden();
  await expect(treeRow(page, "Regnet")).toBeHidden();
});

test("a label is ticked on another scene straight from the row menu's Labels", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await page.getByRole("menuitem", { name: "Ny label…" }).click();
  await page.getByRole("textbox", { name: "Ny label" }).fill("Elin");
  await page
    .getByRole("dialog", { name: "Status och labels" })
    .getByRole("button", { name: "Lägg till" })
    .click();
  await page.keyboard.press("Escape");

  await treeRow(page, "Köket").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).hover();
  await page.getByRole("menuitemradio", { name: "Elin" }).click();

  await expect(sidebar(page).locator('.tree-dot[title="Elin"]')).toHaveCount(2);
});

test("the palette's label chip finds only what has the label", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await page.getByRole("menuitem", { name: "Ny label…" }).click();
  await page.getByRole("textbox", { name: "Ny label" }).fill("Skriv om");
  await page
    .getByRole("dialog", { name: "Status och labels" })
    .getByRole("button", { name: "Lägg till" })
    .click();
  await page.keyboard.press("Escape");

  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Kommandopalett" });
  await palette.getByRole("button", { name: "Skriv om" }).click();

  await expect(palette.getByRole("option")).toHaveText([/^Isen/]);
});

test("a status step gets the book's own name, shown in the row menu", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Status" }).click();
  await page.getByRole("menuitem", { name: "Ändra stegen…" }).click();
  const name = page.getByRole("textbox", { name: "Namn på steget Redigering" });
  await name.fill("Hos redaktören");
  await name.press("Tab");
  await page.keyboard.press("Escape");

  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Status" }).click();

  await expect(page.getByRole("menuitemradio", { name: "Hos redaktören" })).toBeVisible();
});

test("Innehåll shows each chapter's labels, its scenes' too", async ({ page }) => {
  await treeRow(page, "Isen").click({ button: "right" });
  await page.getByRole("menuitem", { name: "Labels" }).click();
  await page.getByRole("menuitem", { name: "Ny label…" }).click();
  await page.getByRole("textbox", { name: "Ny label" }).fill("Elin");
  const dialog = page.getByRole("dialog", { name: "Status och labels" });
  await dialog.getByRole("button", { name: "Lägg till" }).click();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Vintervägen" }).first().click();

  await expect(page.locator(".contents-row").first().locator(".contents-label")).toHaveText("Elin");
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
