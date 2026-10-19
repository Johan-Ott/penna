import { expect, test } from "@playwright/test";
import { openExample, runCommand } from "./helpers";

test("the print cover counts the book's pages for its spine, and keeps the back text", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");
  await page
    .locator(".publish-tile")
    .filter({ hasText: /^Exportera/ })
    .click();

  await page.getByRole("radio", { name: "Tryckomslag" }).click();
  await expect(page.getByText(/Ryggen blir [\d,]+ mm vid \d+ sidor/)).toBeVisible({
    timeout: 40_000,
  });
  await page.getByLabel("Baksidestext").fill("En roman om is och tystnad.");
  await page.getByRole("radio", { name: "Krämvitt" }).click();

  await expect(page.getByLabel("Baksidestext")).toHaveValue("En roman om is och tystnad.");
  await expect(page.getByRole("button", { name: "Exportera omslag" })).toBeVisible();
});

test("each export shows its own preview, and an ISBN that cannot be one says so", async ({
  page,
}) => {
  await openExample(page);
  await runCommand(page, "Gå till Publicera");
  await page
    .locator(".publish-tile")
    .filter({ hasText: /^Exportera/ })
    .click();

  await page.getByRole("radio", { name: "Tryckomslag" }).click();
  await expect(page.getByText("Förhandsvisning · Framsidan")).toBeVisible();
  await page.getByRole("radio", { name: "Text", exact: true }).click();
  await expect(page.getByText("Förhandsvisning · Ren text")).toBeVisible();

  await page
    .locator(".publish-tile")
    .filter({ hasText: /^Bokuppgifter/ })
    .click();
  await page.getByLabel("ISBN (valfritt)").fill("abc123");
  await expect(page.getByText("Ett ISBN har 10 eller 13 siffror")).toBeVisible();
});
