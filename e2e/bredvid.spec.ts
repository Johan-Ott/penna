import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test("another text opens beside the one being written, and closes again", async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await openExample(page);

  await page.locator(".sidebar").getByText("Isen", { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Öppna bredvid" }).click();

  const beside = page.getByRole("complementary", { name: "Bredvid" });
  await expect(beside).toContainText("Isen bar.");
  await expect(editor(page)).toContainText("Brevet låg på köksbordet");
  await beside.getByRole("button", { name: "Stäng" }).click();
  await expect(beside).toBeHidden();
});
