import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

// window.penna as a script on the computer would call it.
interface Penna {
  run: (name: string) => string | null;
  type: (text: string) => void;
  text: () => string;
  tree: () => { id: string; title: string }[];
  open: (id: string) => void;
}
type WithPenna = Window & { penna: Penna };

test("window.penna makes a scene with a command, writes in it, and reads it back", async ({
  page,
}) => {
  expect(await page.evaluate(() => (window as unknown as WithPenna).penna.run("Ny scen"))).toBe(
    "Ny scen",
  );
  await expect(editor(page)).toBeFocused();
  await page.evaluate(() => (window as unknown as WithPenna).penna.type("Isen bar till fyren."));

  await expect(editor(page)).toContainText("Isen bar till fyren.");
  expect(await page.evaluate(() => (window as unknown as WithPenna).penna.text())).toContain(
    "Isen bar till fyren.",
  );
});

test("window.penna opens a scene from the tree by its id", async ({ page }) => {
  await page.evaluate(() => {
    const isen = (window as unknown as WithPenna).penna.tree().find((row) => row.title === "Isen");
    if (isen) (window as unknown as WithPenna).penna.open(isen.id);
  });

  await expect(editor(page)).toContainText("Isen bar");
});
