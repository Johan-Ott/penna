import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

test("feedback shows what goes along, and is copied when there is nowhere to send it", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openExample(page);

  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Skicka feedback…" }).click();
  const dialog = page.getByRole("dialog", { name: "Skicka feedback" });
  await dialog.getByLabel("Berätta").fill("Sidkartan visar fel sida.");
  await dialog.getByText("Visa vad som skickas").click();
  await expect(dialog.locator("pre")).toContainText("Penna");
  await dialog.getByRole("button", { name: "Kopiera" }).click();

  await expect(dialog).toContainText("Texten är kopierad");
  // Windows' clipboard ends lines with \r\n.
  const copied = await page.evaluate(async () =>
    (await navigator.clipboard.readText()).replace(/\r\n/g, "\n"),
  );
  expect(copied).toMatch(/^Sidkartan visar fel sida\.\n\n---\nPenna /);
});
