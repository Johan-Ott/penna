import { expect, test } from "@playwright/test";
import { editor, openExample } from "./helpers";

test.beforeEach(async ({ page }) => openExample(page));

// window.skrivro as a script on the computer would call it.
interface Skrivro {
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
type WithSkrivro = Window & { skrivro: Skrivro };

test("window.skrivro makes a scene with a command, writes in it, and reads it back", async ({
  page,
}) => {
  expect(await page.evaluate(() => (window as unknown as WithSkrivro).skrivro.run("Ny scen"))).toBe(
    "Ny scen",
  );
  await expect(editor(page)).toBeFocused();
  await page.evaluate(() =>
    (window as unknown as WithSkrivro).skrivro.type("Isen bar till fyren."),
  );

  await expect(editor(page)).toContainText("Isen bar till fyren.");
  expect(await page.evaluate(() => (window as unknown as WithSkrivro).skrivro.text())).toContain(
    "Isen bar till fyren.",
  );
});

test("window.skrivro opens a scene from the tree by its id", async ({ page }) => {
  await page.evaluate(() => {
    const isen = (window as unknown as WithSkrivro).skrivro
      .tree()
      .find((row) => row.title === "Isen");
    if (isen) (window as unknown as WithSkrivro).skrivro.open(isen.id);
  });

  await expect(editor(page)).toContainText("Isen bar");
});

test("window.skrivro makes a named chapter, a person, and sets when a chapter happens", async ({
  page,
}) => {
  await page.evaluate(async () => {
    const api = (window as unknown as WithSkrivro).skrivro;
    const id = await api.add("chapter", "Stormen");
    if (id) await api.set(id, "när", "Mars");
    await api.note("Personer", "Greta");
  });

  await expect(page.locator(".tree")).toContainText("Stormen");
  await expect(page.locator(".tree")).toContainText("Greta");
});

test("window.skrivro sets the book's goal and puts a label on a chapter by its name", async ({
  page,
}) => {
  const settings = await page.evaluate(async () => {
    const skrivro = (window as unknown as WithSkrivro).skrivro;
    await skrivro.book("totalmål", "90 000");
    const chapter = skrivro.tree().find((row) => row.kind === "chapter");
    if (chapter) await skrivro.label(chapter.id, "Ledtråd");
    return skrivro.book();
  });

  expect(settings.totalGoal).toBe(90000);
  expect(settings.labels?.map((label) => label.name)).toContain("Ledtråd");
});

test("a shortcut can be moved, and keys already in use are refused", async ({ page }) => {
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+,");
  await page.getByRole("button", { name: "Kortkommandon" }).click();
  const palette = page.locator(".settings-row", { hasText: "Kommandopalett" });

  await palette.getByRole("button").click();
  await page.keyboard.press("ControlOrMeta+Shift+f");
  await expect(palette).toContainText("Används redan av Fokusläge");
  await palette.getByRole("button").click();
  await page.keyboard.press("ControlOrMeta+j");
  await expect(palette).toContainText("J");

  await page.keyboard.press("Escape");
  await page.keyboard.press("ControlOrMeta+j");
  await expect(page.getByRole("dialog", { name: "Kommandopalett" })).toBeVisible();
});

test("Ctrl+Shift+N starts a new book from inside a book", async ({ page }) => {
  await editor(page).click();

  await page.keyboard.press("ControlOrMeta+Shift+n");

  await expect(page.getByRole("dialog", { name: "Vad skriver du?" })).toBeVisible();
});
