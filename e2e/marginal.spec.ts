import { expect, test } from "@playwright/test";
import { openExample, selectFirstWord } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 820 });
  await page.addInitScript(() =>
    localStorage.setItem("penna.writing", JSON.stringify({ commentsInMargin: true })),
  );
  await openExample(page);
});

test("a comment stands in the margin beside its words, and Klar ticks it off", async ({ page }) => {
  await selectFirstWord(page);
  await page.keyboard.press("Control+Shift+m");
  await page.keyboard.type("Gulnat?");
  await page.getByRole("button", { name: "Kommentera", exact: true }).last().click();

  const note = page.locator(".margin-note");
  await expect(note).toContainText("Gulnat?");
  await note.getByRole("button", { name: "Klar" }).click();
  await expect(note).toHaveCount(0);
});
