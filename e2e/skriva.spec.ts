import { expect, test } from "@playwright/test";
import {
  cursorAfterFirstParagraph,
  editor,
  openExample,
  runCommand,
  selectFirstWord,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("writing adds words to today's count", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" Hon log.");

  await expect(editor(page)).toContainText("vantarna. Hon log.");
  await expect(page.getByText(/^2 \/ /)).toBeVisible();
});

test("Ctrl+S saves at once and says that Penna saves by itself", async ({ page }) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Spara nu.");

  await page.keyboard.press("Control+s");

  await expect(page.getByRole("status").filter({ hasText: "Sparat" })).toBeVisible();
});

test("undo takes back what was just typed", async ({ page }) => {
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Ångra mig.");

  await page.keyboard.press("Control+z");

  await expect(editor(page)).not.toContainText("Ångra mig.");
});

test("bold is set on the selected word", async ({ page }) => {
  await selectFirstWord(page);

  await page.keyboard.press("Control+b");

  await expect(editor(page).locator("strong")).toHaveText("Brevet");
});

test("a footnote is inserted and its text written in the box", async ({ page }) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.press("Control+Alt+f");
  await page.getByRole("textbox", { name: "Fotnotens text" }).fill("Brevet kom med postbåten.");
  await page.keyboard.press("Enter");

  const note = editor(page).locator("sup.footnote");
  await expect(note).toHaveAttribute("data-text", "Brevet kom med postbåten.");
  await expect(page.getByRole("dialog", { name: "Fotnot" })).toBeHidden();
});

test("a new scene from the palette opens empty, ready to write", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Ny scen");

  await expect(editor(page)).toHaveText("");
  await page.keyboard.type("Ny början.");
  await expect(editor(page)).toHaveText("Ny början.");
});

test("search finds a name across the scene", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("Control+f");
  await page.keyboard.type("Elin");

  await expect(page.getByText(/av \d+/).first()).toBeVisible();
});

test("the focus mode opens and Escape leaves it", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("Control+Shift+f");
  await expect(page.locator(".focus-mode")).toBeVisible();
  await page.keyboard.press("Escape");

  await expect(page.locator(".focus-mode")).toHaveCount(0);
});

test("settings open with Ctrl+comma and show the sync tab", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("Control+,");
  await page.getByRole("button", { name: "Synk" }).click();

  await expect(page.getByText("Synk finns inte på den här enheten än.")).toBeVisible();
});

test("Innehåll lists the chapters", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Gå till Innehåll");

  await expect(page.getByText("Fyren").first()).toBeVisible();
  await expect(page.getByText("Brevet").first()).toBeVisible();
});

test("versions of the open scene can be opened", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Versioner av den här texten");

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the standard manuscript is exported as a Word file", async ({ page }) => {
  await editor(page).click();
  await runCommand(page, "Gå till Publicera");
  await page.getByRole("button", { name: /^3\s*Exportera$/ }).click();

  await page.getByText("Standardmanus", { exact: true }).click();

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportera manus" }).click();

  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("the focus mode button keeps the cursor in the text, so nothing typed is lost", async ({
  page,
}) => {
  await cursorAfterFirstParagraph(page);
  await page.getByRole("button", { name: "Fokusläge · Ctrl+Shift+F" }).click();
  await page.keyboard.press("Enter");
  await page.keyboard.type("Vädret håller.");

  await expect(editor(page).locator("p").nth(1)).toHaveText("Vädret håller.");
});
