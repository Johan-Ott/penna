// `node scripts/store/siteImages.mjs`: the pictures in site/bilder, taken from the web build on
// http://127.0.0.1:1420 (npm run dev:web) with the store pictures' book in showcaseBook.ts.
import { chromium } from "@playwright/test";

const APP = "http://127.0.0.1:1420/";
const OUT = "site/bilder";
const BAGERIET = "01JA0SKRVRBK00000000000001";
const FONSTRET = "01JA0SKRVRBK00000000000003";
const GRETA = "01JA0SKRVRBK00000000000006";

async function openExample(browser, { viewport, scale = 1, colorScheme = "light" }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale, colorScheme });
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
  // An award earned while the example opens is the app's, not the picture's.
  await page.addStyleTag({ content: ".celebrations { display: none !important; }" });
  return page;
}

const open = (page, id) => page.evaluate((nodeId) => globalThis.skrivro.open(nodeId), id);

// Does what leads to a screen, lets it settle, and keeps it.
async function capture(page, file, action) {
  await action();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${file}`, ...(file.endsWith(".jpg") && { quality: 88 }) });
}

const SYNOPSIS = `En lördagsmorgon är den sista kanelbullen borta från Gyllene Kringlan, och bagare Holm misstänker alla utom sig själv. Greta, 78 år och pensionerad postmästare, tar sig an fallet.

Spåren i mjölet leder till katten Sixten, som har sett allt men inte tänker säga ett ord. Under förhöret singlar pärlsocker ner ur Holms mustasch.

Det var Holm. Han åt bullen i sömnen.`;

const desk = { viewport: { width: 1440, height: 900 } };
const browser = await chromium.launch();

for (const [colorScheme, file] of [
  ["light", "skriv.jpg"],
  ["dark", "skriv-mork.jpg"],
]) {
  const page = await openExample(browser, { ...desk, scale: 2, colorScheme });
  await capture(page, file, () => open(page, BAGERIET));
  await page.close();
}

const page = await openExample(browser, desk);
await capture(page, "person.png", () => open(page, GRETA));
await capture(page, "granska.png", async () => {
  await open(page, FONSTRET);
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: /^Granska/ })
    .first()
    .click();
});
await capture(page, "las.png", async () => {
  await page.getByRole("button", { name: "Stäng granskning" }).click();
  await open(page, BAGERIET);
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Läs kapitlet" }).click();
});
await capture(page, "publicera.png", async () => {
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Publicera" }).click();
  await page.getByText("Sätter boken").waitFor({ state: "detached" });
});
await capture(page, "forlag.png", async () => {
  await page.getByRole("button", { name: /^Till förlag/ }).click();
  await page.getByRole("textbox").first().fill(SYNOPSIS);
});
await page.close();

const phone = await openExample(browser, { viewport: { width: 390, height: 844 } });
await capture(phone, "telefon.png", async () => {});
await browser.close();
process.stdout.write(`Klart: ${OUT}\n`);
