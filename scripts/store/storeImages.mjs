// `node scripts/store/storeImages.mjs`: the store pictures in out/store, taken from the web build
// on http://127.0.0.1:1420 (npm run dev:web) with the book in showcaseBook.ts instead of the example.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { composePhone } from "./phonePictures.mjs";
import { bookCover, compose, playIcon, render } from "./storePictures.mjs";

const APP = "http://127.0.0.1:1420/";
const RAW = "out/store/raw";
const COVER = "out/store/omslag.png";

const SHOTS = [
  ["skriv", "Här får orden vara ifred.", "Where words get some peace and quiet."],
  ["boken", "Kapitlen gör som du säger. Oftast.", "Your chapters do as they're told. Mostly."],
  [
    "anteckning",
    "Vem visste vad, och när? Skrivro minns.",
    "Who knew what, and when? Skrivro remembers.",
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
      JSON.stringify({ isOnboardingDone: true, authorName: "J.Martinell" }),
    );
    globalThis.localStorage.setItem("skrivro.guide", JSON.stringify({ isOff: true }));
  });
  await page.goto(APP);
  await page.getByRole("button", { name: "Prova exempelboken" }).click();
  await page.locator(".ProseMirror").waitFor({ state: "attached" });
  await page.waitForTimeout(1200);
  // An award earned while the example opens is the app's, not the picture's.
  await page.addStyleTag({ content: ".celebrations { display: none !important; }" });
  return page;
}

const ELIAS = "01JA0SKRVRBK00000000000006";
const ARKIVET = "01JA0SKRVRBK00000000000003";
const BRON = "01JA0SKRVRBK00000000000001";
const open = (page, id) => page.evaluate((nodeId) => globalThis.skrivro.open(nodeId), id);

const settle = (page) => page.waitForTimeout(900);

// Does what leads to a screen, lets it settle, and keeps it.
async function capture(page, name, action) {
  await action();
  await settle(page);
  await page.screenshot({ path: `${RAW}/${name}.png` });
}

async function phone(browser) {
  const page = await openShowcase(browser, { width: 390, height: 844 }, 3);
  await capture(page, "telefon-skriv", () =>
    page.getByRole("button", { name: /Fortsätt skriva/ }).click(),
  );
  await capture(page, "telefon-las", () =>
    page.getByRole("button", { name: "Läs kapitlet" }).click(),
  );
  await page.close();
}

const keep = (page, selector, name, nth = 0) =>
  page
    .locator(selector)
    .nth(nth)
    .screenshot({ path: `${RAW}/${name}.png` });

// The paragraphs the phone's pictures lift out of the text, from a phone's narrow column so
// their words are large.
async function paragraphs(browser) {
  const page = await openShowcase(browser, { width: 390, height: 844 }, 3);
  await open(page, ARKIVET);
  await settle(page);
  await keep(page, ".ProseMirror p", "stycke-granska", 1);
  await open(page, BRON);
  await settle(page);
  await keep(page, ".ProseMirror p", "stycke-person");
  await page.close();
}

// The cards that go with them, from a window wide enough that Granska stays clear of the text.
async function cards(browser) {
  const page = await openShowcase(browser, { width: 2400, height: 900 }, 3);
  await open(page, ARKIVET);
  await settle(page);
  await page
    .getByRole("button", { name: /^Granska/ })
    .first()
    .click();
  await settle(page);
  await keep(page, ".review-item:has(.comment-quote)", "kommentar");
  await page.getByRole("button", { name: "Stäng granskning" }).click();
  await open(page, BRON);
  await settle(page);
  await page.locator(".ProseMirror").getByText("Elias", { exact: true }).first().click();
  await settle(page);
  await keep(page, ".mention-card", "person-kort");
  await page.close();
}

// The finished book: its cover under Bokuppgifter, put there as a writer would.
async function showCover(page) {
  await page.getByRole("button", { name: /^Bokuppgifter/ }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Byt bild…" }).click();
  await (await chooser).setFiles(COVER);
}

async function desk(browser) {
  const page = await openShowcase(browser, { width: 1440, height: 900 }, 2);
  await capture(page, "dator-skriv", () => open(page, BRON));
  await capture(page, "dator-boken", () =>
    page
      .getByRole("button", { name: /Innehåll/ })
      .first()
      .click(),
  );
  await capture(page, "dator-anteckning", async () => {
    await page.keyboard.press("Escape");
    await open(page, ELIAS);
  });
  await capture(page, "dator-granska", async () => {
    await open(page, ARKIVET);
    await settle(page);
    await page
      .getByRole("button", { name: /^Granska/ })
      .first()
      .click();
  });
  await capture(page, "dator-publicera", async () => {
    await page.getByRole("button", { name: "Stäng granskning" }).click();
    await page.getByRole("tab", { name: "Publicera" }).click();
    await showCover(page);
  });
  await page.close();
}

mkdirSync(RAW, { recursive: true });
const browser = await chromium.launch();
await render(browser, bookCover(), { width: 1600, height: 2560 }, COVER);
if (!process.argv.includes("--bara-bilder")) {
  await phone(browser);
  await paragraphs(browser);
  await cards(browser);
  await desk(browser);
}
for (const lang of ["sv", "en"]) {
  await composePhone(browser, lang, RAW);
  await compose(browser, lang, SHOTS, RAW);
}
await render(browser, playIcon(), { width: 512, height: 512 }, "out/store/play-ikon.png");
await browser.close();
process.stdout.write("Klart: out/store/sv och out/store/en\n");
