import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

// Labels and status steps: made, ticked, shown in the tree and Innehåll, and found in the palette.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

const sidebar = (page: Page) => page.locator(".sidebar");
const treeRow = (page: Page, name: string) => sidebar(page).getByText(name, { exact: true });

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
