// The phone's five store pictures, each its own kind: the book's cover, the phone writing, a
// comment and a person lifted out of the text, and the chapter beside the finished book.
import { mkdirSync } from "node:fs";
import { dataUrl, render, sheet } from "./storePictures.mjs";

const COVER = "out/store/omslag.png";
const SIZE = { width: 1080, height: 1920 };

const caption = (text) => `<h1 style="top:120px;width:900px;font-size:70px">${text}</h1>`;
const shadow = "box-shadow:0 50px 90px rgba(40,30,20,0.3)";

const phone = (file, style) =>
  `<div class="frame" style="${style};border:16px solid #111;border-radius:72px">
  <img style="border-radius:56px" src="${dataUrl(file)}"></div>`;

const hero = (text) =>
  sheet(
    1080,
    1920,
    `${caption(text)}
  <img src="${dataUrl(COVER)}" style="position:absolute;left:220px;top:470px;width:640px;
  transform:rotate(-3deg);border-radius:12px;${shadow}">`,
  );

const writing = (text, raw) =>
  sheet(
    1080,
    1920,
    `${caption(text)}${phone(`${raw}/telefon-skriv.png`, "top:340px;width:760px")}`,
  );

// A piece of the text on its page, and over its edge the card that belongs to it.
const lifted = (text, page, card) =>
  sheet(
    1080,
    1920,
    `${caption(text)}
  <div style="position:absolute;top:360px;bottom:120px;left:60px;right:60px;display:flex;
  flex-direction:column;justify-content:center;align-items:center">
  <div style="width:100%;box-sizing:border-box;padding:56px 44px;background:#fff;border-radius:28px;
  ${shadow}"><img src="${dataUrl(page)}" style="display:block;width:100%"></div>
  <img src="${dataUrl(card)}" style="width:900px;margin-top:-30px;transform:rotate(-2deg);
  border-radius:24px;box-shadow:0 40px 80px rgba(40,30,20,0.35)"></div>`,
  );

const finished = (text, raw) =>
  sheet(
    1080,
    1920,
    `${caption(text)}${phone(`${raw}/telefon-las.png`, "top:360px;left:400px;width:600px")}
  <img src="${dataUrl(COVER)}" style="position:absolute;left:560px;top:880px;width:440px;
  transform:rotate(5deg);border-radius:10px;${shadow}">`,
  );

const PICTURES = [
  [
    "omslag",
    (text) => hero(text),
    "Ett lugnt ställe att skriva din bok.",
    "A calm place to write your book.",
  ],
  ["skriv", writing, "Här får orden vara ifred.", "Where words get some peace and quiet."],
  [
    "granska",
    (text, raw) => lifted(text, `${raw}/stycke-granska.png`, `${raw}/kommentar.png`),
    "En egen redaktör. Ingen röd penna.",
    "Your own editor. No red pen.",
  ],
  [
    "person",
    (text, raw) => lifted(text, `${raw}/stycke-person.png`, `${raw}/person-kort.png`),
    "Vem visste vad, och när? Skrivro minns.",
    "Who knew what, and when? Skrivro remembers.",
  ],
  ["publicera", finished, "Från ”kanske en dag” till e-bok.", "From “someday” to e-book."],
];

export async function composePhone(browser, lang, raw) {
  const dir = `out/store/${lang}`;
  mkdirSync(dir, { recursive: true });
  for (const [index, [name, picture, swedish, english]] of PICTURES.entries()) {
    const html = picture(lang === "sv" ? swedish : english, raw);
    await render(browser, html, SIZE, `${dir}/${index + 1}-${name}-telefon.png`);
  }
}
