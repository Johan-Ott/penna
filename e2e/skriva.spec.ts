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

test("a right-click in the text opens Penna's own menu, and Markera allt selects it all", async ({
  page,
}) => {
  await selectFirstWord(page);
  await editor(page).locator("p").first().click({ button: "right" });

  const menu = page.getByRole("menu", { name: "Text" });
  await expect(menu.getByRole("menuitem", { name: "Kopiera" })).toBeVisible();
  await menu.getByRole("menuitem", { name: "Markera allt" }).click();

  const selected = await page.evaluate(() => String(getSelection()));
  expect(selected).toContain("Brevet låg på köksbordet");
  expect(selected).toContain("Din Henrik");
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

  await expect(page.getByText(/^\d+ träffar$/)).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/^1 av \d+$/)).toBeVisible();
  await page.getByRole("button", { name: "Stäng sökning" }).click();
  await expect(page.getByRole("search")).toBeHidden();
});

test("the palette's chips narrow the search to the kinds chosen", async ({ page }) => {
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", { name: "Kommandopalett" });

  await palette.getByRole("button", { name: "Kapitel", exact: true }).click();
  await page.keyboard.type("fyren");

  await expect(palette.getByRole("option", { name: /Fyren/ })).toHaveCount(1);
  await expect(palette.locator(".palette-group")).toHaveText(["Kapitel", "Kommandon"]);
});

test("across the manuscript the matches are listed by scene, and one opens its scene", async ({
  page,
}) => {
  await editor(page).click();
  await page.keyboard.press("Control+f");
  await page.keyboard.type("Elin");
  await page.getByRole("button", { name: "Hela manuset" }).click();

  const hits = page.getByRole("list", { name: "Träffar i manuset" }).getByRole("listitem");
  await expect(hits).not.toHaveCount(0);
  await hits.filter({ hasText: "· Isen" }).click();

  await expect(editor(page)).toContainText("Isen bar.");
});

test("a status chip narrows the manuscript's matches to scenes in that step", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("Control+f");
  await page.keyboard.type("Elin");
  await page.getByRole("button", { name: "Hela manuset" }).click();

  await page
    .getByRole("group", { name: "Bara scener med" })
    .getByRole("button", { name: "Redigering" })
    .click();

  const hits = page.getByRole("list", { name: "Träffar i manuset" }).getByRole("listitem");
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText("Köket");
});

test("Framsteg shows the book's words per step", async ({ page }) => {
  await page
    .getByText(/^0 \/ 500 ord$/)
    .first()
    .click();

  const progress = page.getByRole("dialog", { name: "Framsteg" });
  await expect(progress.getByText("Ord per steg")).toBeVisible();
  await expect(progress.getByText("Utkast 145")).toBeVisible();
});

test("Med anteckningar searches the notes' text too", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("Control+f");
  await page.keyboard.type("Trettioåtta");
  await page.getByRole("button", { name: "Hela manuset" }).click();
  await expect(page.getByText("Inga träffar")).toBeVisible();

  await page
    .getByRole("group", { name: "Bara scener med" })
    .getByRole("button", { name: "Med anteckningar" })
    .click();

  const hits = page.getByRole("list", { name: "Träffar i manuset" }).getByRole("listitem");
  await expect(hits).toHaveCount(1);
  await expect(hits).toContainText("Elin");
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

test("Om Penna shows the errors since the start, here none", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("Control+,");
  await page.getByRole("button", { name: "Om Penna" }).click();

  await expect(page.getByText("Inga fel sedan starten.")).toBeVisible();
});

test("Innehåll lists the chapters", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Gå till Innehåll");

  await expect(page.getByText("Fyren").first()).toBeVisible();
  await expect(page.getByText("Brevet").first()).toBeVisible();
  // The page map waits for the book to be set, which takes a moment.
  const pages = page.getByRole("list", { name: "Bokens sidor" });
  await expect(pages.getByRole("button", { name: /^Sida \d+, Brevet$/ }).first()).toBeVisible({
    timeout: 30_000,
  });
});

test("versions of the open scene can be opened", async ({ page }) => {
  await editor(page).click();

  await runCommand(page, "Versioner av den här texten");

  await expect(page.getByRole("dialog")).toBeVisible();
});

test("the text's own header opens its versions, beside Läs kapitlet", async ({ page }) => {
  await page.locator(".text-header").getByRole("button", { name: "Versioner" }).click();

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

test("Skicka till redaktör in the menu makes the Word manuscript at once", async ({ page }) => {
  await page.getByRole("button", { name: "Meny" }).first().click();

  const download = page.waitForEvent("download");
  await page.getByRole("menuitem", { name: "Skicka till redaktör…" }).click();

  expect((await download).suggestedFilename()).toMatch(/\.docx$/);
});

test("selected words are shared as a picture, saved as a PNG", async ({ page }) => {
  await selectFirstWord(page);
  await page.getByRole("button", { name: "Dela som bild" }).click();
  const dialog = page.getByRole("dialog", { name: "Dela som bild" });
  await dialog.getByRole("radio", { name: "Kvadrat" }).click();

  const download = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Spara bild" }).click();

  expect((await download).suggestedFilename()).toMatch(/png$/);
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
