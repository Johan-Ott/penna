import { expect, test } from "@playwright/test";
import { openExample, runCommand } from "./helpers";

test.use({ storageState: { cookies: [], origins: [] } });

test("the guide shows one tip at a time where the writer is, and can be skipped", async ({
  page,
}) => {
  await openExample(page);
  const tip = page.getByRole("note", { name: "Tips" });

  await expect(tip).toContainText("Penna sparar av sig själv");
  await expect(tip.getByRole("listitem")).toHaveCount(5);
  await tip.getByRole("button", { name: "Uppfattat" }).click();
  await expect(tip).toBeHidden();

  await runCommand(page, "Gå till Innehåll");
  await expect(tip).toContainText("kapitel för kapitel");
  await tip.getByRole("button", { name: "Hoppa över guiden" }).click();
  await expect(tip).toBeHidden();
});
