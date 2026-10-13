import { expect, test } from "@playwright/test";
import { openExample, runCommand, treeRow } from "./helpers";

test("a research file becomes a note among the notes, showing its picture", async ({ page }) => {
  await openExample(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("src-tauri/icons/128x128.png");

  const header = page.locator(".note-header");
  await expect(header.locator("h1")).toHaveText("128x128");
  await expect(header.locator(".research-picture")).toHaveAttribute("src", /^blob:/);
  await expect(header.locator(".research-file-name")).toHaveText("128x128.png");
  await expect(treeRow(page, "128x128")).toBeVisible();
});

test("a file that is no picture shows its name, and the note takes the writer's words", async ({
  page,
}) => {
  await openExample(page);

  const chooser = page.waitForEvent("filechooser");
  await runCommand(page, "Lägg till fil bland anteckningarna…");
  await (await chooser).setFiles("package.json");

  await expect(page.locator(".research-file-name")).toHaveText("package.json");
  await expect(page.locator(".research-picture")).toHaveCount(0);
  await page.locator(".ProseMirror").click();
  await page.keyboard.type("Beroendena, för säkerhets skull.");
  await expect(page.locator(".ProseMirror")).toContainText("Beroendena");
});
