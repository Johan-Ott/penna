import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openExample } from "./helpers";

const { version: VERSION } = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8")) as {
  version: string;
};

// The mail link is caught before any mail program opens, so no real message is ever written.
async function openFeedback(page: Page) {
  await page.addInitScript(() => {
    window.open = (url) => {
      (window as unknown as { openedMail: string }).openedMail = String(url);
      return null;
    };
  });
  await openExample(page);
  await page.getByRole("button", { name: "Meny" }).first().click();
  await page.getByRole("menuitem", { name: "Hjälp" }).click();
  await page.getByRole("menuitem", { name: "Skicka feedback…" }).click();
  return page.getByRole("dialog", { name: "Skicka feedback" });
}

test("feedback opens a mail, and the report goes along only with something wrong", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const dialog = await openFeedback(page);

  await expect(dialog.getByText("Skicka med felrapporten")).toBeVisible();
  await dialog.getByRole("radio", { name: "En idé" }).click();
  await expect(dialog.getByText("Skicka med felrapporten")).toBeHidden();
  await dialog.getByLabel("Berätta").fill("Fler kapitelmallar som standard.");
  await dialog.getByRole("button", { name: "Skriv mejlet" }).click();

  await expect(dialog).toContainText("Ditt mejlprogram öppnas");
  const opened = await page.evaluate(
    () => (window as unknown as { openedMail: string }).openedMail,
  );
  expect(opened).toMatch(/^mailto:johan\.lonelodge@gmail\.com\?subject=Penna/);
  expect(decodeURIComponent(opened)).toContain("Fler kapitelmallar som standard.");
});

test("the text is copied too, in case no mail program opens", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const dialog = await openFeedback(page);

  await dialog.getByLabel("Berätta").fill("Sidkartan visar fel sida.");
  await dialog.getByRole("button", { name: "Skriv mejlet" }).click();

  await expect(dialog).toContainText("texten kopierad");
  // Windows' clipboard ends lines with \r\n.
  const copied = await page.evaluate(async () =>
    (await navigator.clipboard.readText()).replace(/\r\n/g, "\n"),
  );
  expect(copied).toMatch(/^Sidkartan visar fel sida\.\n\n---\nPenna /);
});

test("after an update, Penna shows what is new once, and asks what the writer thinks", async ({
  page,
}) => {
  await page.addInitScript((version) => {
    if (sessionStorage.getItem("started")) return;
    localStorage.setItem("penna.app", JSON.stringify({ isOnboardingDone: true }));
    localStorage.setItem("penna.seenVersion", "0.0.1");
    localStorage.setItem(
      "penna.updateNotes",
      JSON.stringify({ version, notes: "* Tidslinje | Timeline" }),
    );
    sessionStorage.setItem("started", "yes");
  }, VERSION);
  await page.goto("/");
  const news = page.getByRole("dialog", { name: `Nytt i Penna ${VERSION}` });

  await expect(news).toContainText("Tidslinje");
  await news.getByRole("button", { name: "Tyck till" }).click();
  await expect(page.getByRole("dialog", { name: "Skicka feedback" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Prova exempelboken" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: /Nytt i Penna/ })).toBeHidden();
});
