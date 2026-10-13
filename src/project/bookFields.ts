import { canBeDeep, TENSES, VOICES, type Narration } from "../manuscript/narration.js";
import { BOOK_LANGUAGES } from "./bookLanguage.js";

// The book's own settings as a writer names them, the same as Ny bok and Framsteg set them.

type Fields = Record<string, unknown>;

export const BOOK_FIELDS = ["titel", "totalmål", "dagsmål", "deadline", "röst", "språk"];
const NUMBER_FIELDS: Record<string, string> = { totalmål: "totalGoal", dagsmål: "dailyGoal" };
const DATE = /^\d{4}-\d\d-\d\d$/;

function wholeNumber(value: string) {
  const digits = value.replace(/\s/g, "");
  if (!/^\d+$/.test(digits)) throw new Error(`"${value}" är inte ett heltal.`);
  return Number(digits);
}

function dateOrNone(value: string) {
  const date = value.trim();
  if (date !== "" && !DATE.test(date))
    throw new Error(`Deadline skrivs som 2027-03-01, eller tom för ingen.`);
  return date;
}

/** "jag, dåtid, djup": a voice, a tense, and "djup" for deep POV. */
function narrationFrom(value: string): Narration {
  const words = value.toLowerCase().split(/[\s,]+/);
  const voice = VOICES.find(([id]) => words.includes(id))?.[0];
  const tense = TENSES.find(([id]) => words.includes(id))?.[0];
  if (!voice || !tense)
    throw new Error(`Rösten skrivs som jag, tredje eller allvetande, dåtid eller nutid, och djup.`);
  return { voice, tense, deep: canBeDeep(voice) && words.includes("djup") };
}

function languageFrom(value: string) {
  const wanted = value.trim().toLowerCase();
  const found = BOOK_LANGUAGES.find(
    ([tag, name]) => tag.toLowerCase() === wanted || name.toLowerCase() === wanted,
  );
  if (!found) throw new Error(`Språken: ${BOOK_LANGUAGES.map(([, name]) => name).join(", ")}.`);
  return found[0];
}

/** One of the book's settings changed by its Swedish name. */
export function withBookField(fields: Fields, name: string, value: string): Fields {
  const field = name.trim().toLowerCase();
  const numberField = NUMBER_FIELDS[field];
  if (numberField) return { ...fields, [numberField]: wholeNumber(value) };
  if (field === "titel") return { ...fields, title: value.trim() };
  if (field === "deadline") return { ...fields, deadline: dateOrNone(value) };
  if (field === "röst") return { ...fields, narration: narrationFrom(value) };
  if (field === "språk") return { ...fields, language: languageFrom(value) };
  throw new Error(`Fälten heter ${BOOK_FIELDS.join(", ")}, inte ${name}.`);
}
