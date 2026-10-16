import { expect, test } from "@playwright/test";
import { editor } from "./helpers";

test("the first start goes to the shelf, where a new book opens a scene to write in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Kom igång" })).toBeVisible({ timeout: 50_000 });
  await page.getByRole("button", { name: "Kom igång" }).click();
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Isen");
  await page.getByRole("button", { name: "Skapa boken" }).click();
  await editor(page).click();
  await page.keyboard.type("Det var kallt.");

  await expect(editor(page)).toHaveText("Det var kallt.");
  await expect(page.locator(".sidebar")).toContainText("Isen");
});

test("a new book takes as many pieces as the writer picks, and moves on only with Fortsätt", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("button", { name: "Fortsätt" }).click();

  for (const piece of ["Deckare", "Romans", "Thriller"]) {
    await page.getByRole("button", { name: piece, exact: true }).click();
  }

  await expect(page.getByRole("dialog", { name: "Vad för sorts berättelse?" })).toBeVisible();
  for (const piece of ["Deckare", "Romans", "Thriller"]) {
    await expect(page.getByRole("button", { name: piece, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
});

test("an empty book opens on its welcome, which goes to the trash on request", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 820 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Kom igång" }).click({ timeout: 50_000 });
  await page.getByRole("button", { name: "+ Ny bok" }).click();
  await page.getByRole("radio", { name: /Annat/ }).click();
  for (let step = 0; step < 3; step++) await page.getByRole("button", { name: "Fortsätt" }).click();
  await page.getByPlaceholder("Arbetstitel duger").fill("Tom");
  await page.getByRole("button", { name: "Skapa boken" }).click();

  await expect(editor(page)).toContainText("inte en del av boken");
  await expect(page.locator(".sidebar")).not.toContainText("Personer");
  await page.getByRole("button", { name: "Ta bort välkomsten" }).click();

  await expect(page.locator(".sidebar")).not.toContainText("Välkommen");
});
