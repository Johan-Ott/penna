import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

test("reaching the daily goal is celebrated, and the ink shows in the journey", async ({
  page,
}) => {
  await editor(page).locator("p").last().click();
  await page.keyboard.press("End");
  await page.keyboard.insertText(` ${Array.from({ length: 520 }, () => "ord").join(" ")}`);

  await expect(page.getByRole("status").getByText("Dagens sida är skriven.")).toBeVisible();
  await page.locator(".day-progress").click();
  await page.locator(".insight-journey").click();
  const journey = page.getByRole("dialog", { name: "Skrivarresan" });
  await expect(journey.getByText("520 ord sedan du började.", { exact: false })).toBeVisible();
  await expect(page.locator(".insight-journey")).toContainText("75 bläck");
});

test("holiday mode is turned on from the inkwell", async ({ page }) => {
  await page.locator(".day-progress").click();
  await page.locator(".insight-journey").click();
  await page.getByRole("button", { name: "Slå på semesterläge" }).click();

  await expect(page.getByRole("button", { name: /Semesterläge på/ })).toBeVisible();
});

test("a book opens where the writer left off, and a key goes on from there", async ({ page }) => {
  await editor(page).locator("p").first().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Hon log. Sedan gick hon");
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Bokhylla" }).click();
  await page.getByText("Vintervägen").first().click();

  const resume = page.locator(".resume-screen");
  await expect(resume).toContainText("Du slutade här · 1. Brevet · Köket");
  await expect(resume.locator(".resume-sentence")).toHaveText("Sedan gick hon");
  await page.keyboard.press("Shift");
  await expect(resume).toBeHidden();
});

test("the profile is opened from the sidebar and keeps what was written", async ({ page }) => {
  await page.getByRole("button", { name: "Din profil" }).click();
  const profile = page.getByRole("dialog", { name: "Författarprofil" });
  await profile.getByRole("textbox", { name: "Namn", exact: true }).fill("Elin Berg");
  await profile.getByRole("textbox", { name: "Om författaren" }).fill("Skriver om is och fyrar.");
  await profile.getByRole("button", { name: "Klar" }).click();

  await page.getByRole("button", { name: "Elin Berg" }).click();
  await expect(profile.getByRole("textbox", { name: "Om författaren" })).toHaveValue(
    "Skriver om is och fyrar.",
  );
});
