import { expect, test } from "@playwright/test";
import { cursorAfterFirstParagraph, editor, openExample, runCommand } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
});

test("autocorrect gives a sentence its capital and HEj its case, and Backspace takes it back", async ({
  page,
}) => {
  await cursorAfterFirstParagraph(page);

  await page.keyboard.type(" hon log. HEjsan ", { delay: 5 });
  await expect(editor(page)).toContainText("vantarna. Hon log. Hejsan ");

  await page.keyboard.type("då. d");
  await page.keyboard.press("Backspace");
  await expect(editor(page)).toContainText("Hejsan då. d");
});

test("Sök efter uppdateringar says so when this is the newest Penna", async ({ page }) => {
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Sök efter uppdateringar…" }).click();

  await expect(page.getByText("Du har den senaste versionen av Penna.")).toBeVisible();
});

test("a writing sprint counts the words written and can be ended", async ({ page }) => {
  await runCommand(page, "Skrivsprint");
  await cursorAfterFirstParagraph(page);
  await page.keyboard.type(" Hon log och gick.");
  const sprint = page.getByRole("timer");
  await expect(sprint).toContainText("4 ord", { timeout: 5000 });

  await sprint.getByRole("button", { name: "Avsluta" }).click();
  await expect(page.getByText("Sprinten är klar: 4 ord på 25 minuter.")).toBeVisible();
});
