import { expect, test } from "@playwright/test";
import { openExample, sidebar } from "./helpers";

test("the book gets a new name from Boken in the menu", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Boken" }).click();
  await page.getByRole("menuitem", { name: "Byt namn på boken…" }).click();

  const dialog = page.getByRole("dialog", { name: "Byt namn på boken" });
  await dialog.getByLabel("Titel").fill("Isvägen");
  await dialog.getByRole("button", { name: "Byt namn" }).click();

  await expect(sidebar(page)).toContainText("Isvägen");
});

test("the profile picture opens the account: profile, sign-in and updates", async ({ page }) => {
  await openExample(page);
  await page.getByRole("button", { name: "Din profil" }).first().click();

  await expect(page.getByRole("menuitem", { name: "Din profil…" })).toBeVisible();
  await page.getByRole("menuitem", { name: "Sök efter uppdateringar…" }).click();
  await expect(page.getByText("Du har den senaste versionen av Penna.")).toBeVisible();
});
