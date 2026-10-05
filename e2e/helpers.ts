import { expect, type Page } from "@playwright/test";

/** Opens the example book "Vintervägen" with its first scene in the editor. */
export async function openExample(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem("penna.app")) {
      localStorage.setItem("penna.app", JSON.stringify({ isOnboardingDone: true }));
    }
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Öppna exempelprojektet" }).click();
  await expect(page.locator(".ProseMirror")).toContainText("Brevet låg på köksbordet");
}

export const editor = (page: Page) => page.locator(".ProseMirror");

/** Puts the cursor at the end of the scene's first paragraph. */
export async function cursorAfterFirstParagraph(page: Page) {
  await editor(page).locator("p").first().click();
  await page.evaluate(() => {
    const paragraph = document.querySelector(".ProseMirror p");
    if (!paragraph) return;
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    range.collapse(false);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await settleSelection(page);
}

/** Selects the first word of the scene, "Brevet". */
export async function selectFirstWord(page: Page) {
  await editor(page).locator("p").first().click();
  await page.evaluate(() => {
    const paragraph = document.querySelector(".ProseMirror p");
    const text = paragraph && document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT).nextNode();
    if (!text) return;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, "Brevet".length);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await settleSelection(page);
}

// ProseMirror reads a selection change on the next event loop turn, after "selectionchange".
async function settleSelection(page: Page) {
  await page.evaluate(() => new Promise((done) => setTimeout(done, 50)));
}
