import { statSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openExample } from "../helpers";

// A writer readying her book for print: chooses a look, makes a chapter opening of her own,
// fills in the book's details, and exports the print PDF, the cover and the e-book.

async function exported(page: Page, format: string, button: string, folder: string) {
  await page.getByText(format, { exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 90_000 });
  await page.getByRole("button", { name: button }).click();
  const file = join(folder, (await download).suggestedFilename());
  await (await download).saveAs(file);
  return statSync(file).size;
}

test("a book is designed, given its details, and exported for print and as an e-book", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);
  await page.getByRole("tab", { name: "Publicera" }).click();

  await page.getByRole("radio", { name: /Modern/ }).click();
  await page.getByRole("button", { name: "+ Ny mall" }).click();
  await page.getByRole("menuitem", { name: "Ornament" }).click();
  await page.getByRole("button", { name: "Klar", exact: true }).click();
  await expect(page.locator(".publish")).toContainText("Ornament");

  await page.getByRole("button", { name: /^2\s*Bokuppgifter/ }).click();
  await page.getByLabel("Författarnamn").fill("Elin Berg");
  await page.getByLabel("Författarnamn").press("Tab");

  await page.getByRole("button", { name: /^3\s*Exportera$/ }).click();
  const folder = testInfo.outputDir;
  expect(await exported(page, "Tryck-PDF", "Exportera tryck-PDF", folder)).toBeGreaterThan(10_000);
  expect(await exported(page, "E-bok", "Exportera e-bok", folder)).toBeGreaterThan(5_000);
  await page.getByText("Tryckomslag", { exact: true }).click();
  await expect(page.getByText(/Ryggen blir [\d,]+ mm vid \d+ sidor/)).toBeVisible({
    timeout: 60_000,
  });
  expect(await exported(page, "Tryckomslag", "Exportera omslag", folder)).toBeGreaterThan(5_000);
});
