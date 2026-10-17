import { CHARACTERS_ID, PLACES_ID, THINGS_ID } from "./sorts.js";
import { t } from "../i18n/i18n.js";

// A new person, place or thing starts as a short sheet of what writers want to know of one, each
// answered on its own line or deleted. Other sorts start empty.

const PROMPTS: Record<string, () => string[]> = {
  [CHARACTERS_ID]: () => [t("Vill"), t("Rädd för"), t("Döljer"), t("Utseende och röst")],
  [PLACES_ID]: () => [
    t("Syn, lukt och ljud"),
    t("Vad som har hänt här"),
    t("Vem som hör hemma här"),
  ],
  [THINGS_ID]: () => [t("Ägs av"), t("Varför den spelar roll")],
};

/** The new note's text: its sort's prompts in bold, a line each; "" for other sorts. */
export function noteQuestions(sortId: string) {
  const prompts = PROMPTS[sortId]?.() ?? [];
  return prompts.map((prompt) => `**${prompt}:** \n\n`).join("");
}
