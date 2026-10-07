import { expect, test, type Page } from "@playwright/test";

// A planner on her computer: lays out parts and chapters first, keeps a cast of characters,
// writes a little, and plans the book in Innehåll with what happens and when.

const editor = (page: Page) => page.locator(".ProseMirror");
const sidebar = (page: Page) => page.locator(".sidebar");

async function add(page: Page, what: string) {
  await page.getByRole("button", { name: "Lägg till" }).click();
  await page.getByRole("menuitem", { name: what }).click();
}

test("a planner lays out a book, keeps her characters, and plans it in Innehåll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("Välkommen till Penna.")).toBeVisible({ timeout: 50_000 });
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Saltet");
  await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByRole("button", { name: "Börja skriva" }).click();
  await page.keyboard.type("Sigrid kom till ön i mars.", { delay: 2 });

  // The outline: a second chapter and a part, before much is written.
  await add(page, "Nytt kapitel");
  // The new chapter waits for its name, as a new folder does.
  await page.keyboard.type("Ankomsten");
  await page.keyboard.press("Enter");
  await add(page, "Ny del");
  await page.keyboard.press("Escape");
  await expect(sidebar(page)).toContainText("Ankomsten");

  // A character, linked in the text: her name becomes something to click.
  await page.getByRole("button", { name: "+ Ny anteckning" }).click();
  const dialog = page.getByRole("dialog", { name: "Ny anteckning" });
  await dialog.getByRole("textbox", { name: "Namn" }).fill("Sigrid");
  await dialog.getByRole("button", { name: "Skapa" }).click();
  // The new note opens, and the tree unfolds Personer to show it.
  await expect(sidebar(page)).toContainText("Sigrid");

  await sidebar(page).getByRole("treeitem").filter({ hasText: "Första scenen" }).first().click();
  await expect(editor(page).locator(".mention").first()).toContainText("Sigrid");
  await editor(page).locator(".mention").first().click();
  await expect(page.locator(".mention-card")).toContainText("Sigrid");
  await page.keyboard.press("Escape");

  // Innehåll: what happens in the first chapter, and when.
  await page.getByRole("button", { name: "Saltet" }).click();
  const contents = page.locator(".contents-view");
  await contents.getByLabel("Vad händer?").first().fill("Sigrid kommer till ön.");
  await contents.getByLabel("Vad händer?").first().press("Enter");
  await contents.getByLabel("När?").first().fill("Mars");
  await contents.getByLabel("När?").first().press("Enter");
  await contents.getByRole("radio", { name: "Tidsordning" }).click();
  await expect(contents.getByLabel("När?").first()).toHaveValue("Mars");

  // Everything planned is still there after the book is closed and opened again.
  await page.keyboard.press("Control+Shift+O");
  await page.getByText("Saltet").first().click();
  await page.getByRole("button", { name: "Saltet" }).click();
  await expect(page.locator(".contents-view").getByLabel("Vad händer?").first()).toHaveValue(
    "Sigrid kommer till ön.",
  );
});
