import { expect, test, type Page } from "@playwright/test";
import { openExample } from "./helpers";

// The tests answer for Formspree themselves, so no real message is ever sent.
async function openFeedback(page: Page, status: number) {
  await page.route("https://formspree.io/**", (route) =>
    route.fulfill({ status, contentType: "application/json", body: "{}" }),
  );
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Skicka feedback…" }).click();
  return page.getByRole("dialog", { name: "Skicka feedback" });
}

test("feedback is sent, and the report goes along only with something wrong", async ({ page }) => {
  const dialog = await openFeedback(page, 200);

  await expect(dialog.getByText("Skicka med felrapporten")).toBeVisible();
  await dialog.getByRole("radio", { name: "En idé" }).click();
  await expect(dialog.getByText("Skicka med felrapporten")).toBeHidden();
  await dialog.getByLabel("Berätta").fill("Fler kapitelmallar som standard.");
  await dialog.getByRole("button", { name: "Skicka" }).click();

  await expect(dialog).toContainText("Tack!");
});

test("feedback that cannot be sent is copied instead", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const dialog = await openFeedback(page, 500);

  await dialog.getByLabel("Berätta").fill("Sidkartan visar fel sida.");
  await dialog.getByRole("button", { name: "Skicka" }).click();

  await expect(dialog).toContainText("Texten är kopierad");
  // Windows' clipboard ends lines with \r\n.
  const copied = await page.evaluate(async () =>
    (await navigator.clipboard.readText()).replace(/\r\n/g, "\n"),
  );
  expect(copied).toMatch(/^Sidkartan visar fel sida\.\n\n---\nPenna /);
});
