import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

// window.penna as a script on the computer would call it.
interface Penna {
  add: (kind: string, title?: string, afterId?: string) => Promise<string | null>;
  note: (sort: string, name: string) => Promise<void>;
  set: (id: string, field: string, text: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  run: (name: string) => string | null;
  type: (text: string) => void;
  text: () => string;
  tree: () => { id: string; kind: string; title: string }[];
  book: (
    field?: string,
    value?: string,
  ) => Promise<{ totalGoal?: number; labels?: { name: string }[] }>;
  label: (id: string, name: string) => Promise<void>;
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

test("window.penna makes a named chapter, a person, and sets when a chapter happens", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const api = (window as unknown as WithPenna).penna;
    const id = await api.add("chapter", "Stormen");
    if (id) await api.set(id, "när", "Mars");
    await api.note("Personer", "Greta");
  });

  await expect(page.locator(".tree")).toContainText("Stormen");
  await expect(page.locator(".tree")).toContainText("Greta");
});

test("window.penna sets the book's goal and puts a label on a chapter by its name", async ({
  page,
}) => {
  const settings = await page.evaluate(async () => {
    const penna = (window as unknown as WithPenna).penna;
    await penna.book("totalmål", "90 000");
    const chapter = penna.tree().find((row) => row.kind === "chapter");
    if (chapter) await penna.label(chapter.id, "Ledtråd");
    return penna.book();
  });

  expect(settings.totalGoal).toBe(90000);
  expect(settings.labels?.map((label) => label.name)).toContain("Ledtråd");
});

test("a shortcut can be moved, and keys already in use are refused", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("Control+,");
  await page.getByRole("button", { name: "Kortkommandon" }).click();
  const palette = page.locator(".settings-row", { hasText: "Kommandopalett" });

  await palette.getByRole("button").click();
  await page.keyboard.press("Control+Shift+f");
  await expect(palette).toContainText("Används redan av Fokusläge");
  await palette.getByRole("button").click();
  await page.keyboard.press("Control+j");
  await expect(palette).toContainText("Ctrl+J");

  await page.keyboard.press("Escape");
  await page.keyboard.press("Control+j");
  await expect(page.getByRole("dialog", { name: "Kommandopalett" })).toBeVisible();
});
