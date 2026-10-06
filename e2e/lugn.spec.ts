import { expect, test } from "@playwright/test";
import { openExample } from "./helpers";

// A render that starts another render never ends, and keeps the computer busy for nothing.
test("an open book settles: no errors and no render that starts itself again", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await openExample(page);

  await page.waitForTimeout(2000);

  expect(errors).toEqual([]);
});
