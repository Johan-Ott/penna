// `node scripts/store/storeImages.mjs`: the store pictures in out/store, taken from the web build
// on http://127.0.0.1:1420 (npm run dev:web) with the book in showcaseBook.ts instead of the example.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { compose, playIcon, render } from "./storePictures.mjs";

const APP = "http://127.0.0.1:1420/";
const RAW = "out/store/raw";

const SHOTS = [
  ["skriv", "Här får orden vara ifred.", "Where words get some peace and quiet."],
  ["boken", "Kapitlen gör som du säger. Oftast.", "Your chapters do as they're told. Mostly."],
  [
    "anteckning",
    "Vad hette katten nu igen? Skrivro minns.",
    "What was the cat called again? Skrivro remembers.",
  ],
  ["granska", "En egen redaktör. Ingen röd penna.", "Your own editor. No red pen."],
  ["publicera", "Från ”kanske en dag” till e-bok.", "From “someday” to e-book."],
];

async function openShowcase(browser, viewport, scale) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  await page.route("**/src/demo/demoProject.ts*", async (route) => {
    const url = route
      .request()
      .url()
      .replace("/src/demo/demoProject.ts", "/scripts/store/showcaseBook.ts");
    await route.fulfill({ response: await route.fetch({ url }) });
  });
  await page.addInitScript(() => {
    globalThis.localStorage.setItem(
      "skrivro.app",
      JSON.stringify({ isOnboardingDone: true, authorName: "Greta Lind" }),
    );
    globalThis.localStorage.setItem("skrivro.guide", JSON.stringify({ isOff: true }));
  });
  await page.goto(APP);
  await page.getByRole("button", { name: "Prova exempelboken" }).click();
  await page.locator(".ProseMirror").waitFor({ state: "attached" });
  await page.waitForTimeout(1200);
  return page;
}

const GRETA = "01JA0SKRVRBK00000000000006";
const FONSTRET = "01JA0SKRVRBK00000000000003";
const BAGERIET = "01JA0SKRVRBK00000000000001";
const open = (page, id) => page.evaluate((nodeId) => globalThis.skrivro.open(nodeId), id);

const settle = (page) => page.waitForTimeout(900);

// Does what leads to a screen, lets it settle, and keeps it.
async function capture(page, name, action) {
  await action();
  await settle(page);
  await page.screenshot({ path: `${RAW}/${name}.png` });
}

// A chapter of one scene opens it at once; one of more lists its scenes first.
async function openFromTree(page, row, names) {
  for (const name of names) {
    if (await row(name).isVisible()) await row(name).click();
    await settle(page);
  }
}

async function phone(browser) {
  const page = await openShowcase(browser, { width: 390, height: 844 }, 3);
  const tab = (name) =>
    page.getByRole("navigation", { name: "Läge" }).getByRole("button", { name });
  const row = (name) => page.getByRole("treeitem").filter({ hasText: name }).first();
  const back = () => page.evaluate(() => globalThis.history.back());
  await capture(page, "telefon-boken", async () => {});
  await capture(page, "telefon-skriv", () =>
    page.getByRole("button", { name: /Fortsätt skriva/ }).click(),
  );
  await capture(page, "telefon-anteckning", async () => {
    await back();
    await row("Personer").click();
    await row("Greta").click();
  });
  await capture(page, "telefon-granska", async () => {
    await back();
    await tab("Boken").click();
    await openFromTree(page, row, ["Katten vet något", "Fönsterbrädan"]);
    await page.getByRole("button", { name: /att se över/ }).click();
  });
  await capture(page, "telefon-publicera", async () => {
    await page.getByRole("button", { name: "Stäng granskning" }).click();
    await tab("Publicera").click();
    await scrollPreview(page, 195, 700);
  });
  await page.close();
}

async function scrollPreview(page, left, distance) {
  await settle(page);
  await page.mouse.move(left, 600);
  await page.mouse.wheel(0, distance);
}

async function desk(browser) {
  const page = await openShowcase(browser, { width: 1440, height: 900 }, 2);
  await capture(page, "dator-skriv", () => open(page, BAGERIET));
  await capture(page, "dator-boken", () =>
    page
      .getByRole("button", { name: /Innehåll/ })
      .first()
      .click(),
  );
  await capture(page, "dator-anteckning", async () => {
    await page.keyboard.press("Escape");
    await open(page, GRETA);
  });
  await capture(page, "dator-granska", async () => {
    await open(page, FONSTRET);
    await settle(page);
    await page
      .getByRole("button", { name: /^Granska/ })
      .first()
      .click();
  });
  await capture(page, "dator-publicera", async () => {
    await page.getByRole("button", { name: "Stäng granskning" }).click();
    await page.getByRole("tab", { name: "Publicera" }).click();
    await scrollPreview(page, 1100, 650);
  });
  await page.close();
}

mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
if (!process.argv.includes("--bara-bilder")) {
  await phone(browser);
  await desk(browser);
}
await compose(browser, "sv", SHOTS, RAW);
await compose(browser, "en", SHOTS, RAW);
await render(browser, playIcon(), { width: 512, height: 512 }, "out/store/play-ikon.png");
await browser.close();
process.stdout.write("Klart: out/store/sv och out/store/en\n");
