import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

// Sök: in the scene, across the manuscript with its hit list, narrowed by steps, and in the notes.

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await openExample(page);
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
