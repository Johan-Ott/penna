import { expect, test } from "@playwright/test";
import { editor, openExample, runCommand, sidebar } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("a new person starts as a short sheet to fill in", async ({ page }) => {
  await page.getByText("+ Ny anteckning").click();
  await page.keyboard.type("Henrik");
  await page.keyboard.press("Enter");

  await expect(editor(page)).toContainText("Vill:");
  await expect(editor(page)).toContainText("Döljer:");
});

test("Rollista shows the people as cards, and a card opens the person", async ({ page }) => {
  await runCommand(page, "Gå till Innehåll");
  await page.getByRole("radio", { name: "Rollista" }).click();

  const card = page.locator(".cast-card", { hasText: "Arvid" });
  await expect(card).toContainText("Elins farbror");
  await expect(card).toContainText("Nämns i kap.");
  await card.click();

  await expect(page.locator(".note-header h1")).toHaveText("Arvid");
});

test("whose eyes a chapter is seen through shows in the tree", async ({ page }) => {
  await expect(sidebar(page).locator(".tree-pov").first()).toHaveAttribute("data-pov", "Elin");
});

test("what a chapter is for stands under its title while writing it", async ({ page }) => {
  const task = page.getByRole("textbox", { name: "Vad händer i kapitlet?" });

  await expect(task).toHaveValue(/Elin får ett brev från Henrik/);
});
