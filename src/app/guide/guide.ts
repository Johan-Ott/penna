import { createGuide } from "@llkit/guide/guide.js";
import { t } from "../../i18n/i18n.js";
import { platform } from "../platform.js";

// Skrivro's guide for a new writer: a tip in each part of Skrivro, in the order a book is made.

export const STEPS = [
  {
    id: "skriv",
    name: t("Skriv"),
    // A phone keeps the tree under Boken, not to the left.
    text: platform.isPhone
      ? t("Skriv här. Skrivro sparar av sig själv. Kapitel och scener lägger du till under Boken.")
      : t(
          "Skriv här. Skrivro sparar av sig själv. Kapitel och scener lägger du till i trädet till vänster.",
        ),
  },
  {
    id: "anteckningar",
    name: t("Anteckningar"),
    text: t(
      "En anteckning håller en person, en plats eller en sak. Namnet blir en länk i texten, så du hittar hit medan du skriver.",
    ),
  },
  {
    id: "planera",
    name: t("Planera"),
    text: t(
      "Innehåll visar boken kapitel för kapitel, med vad som händer och när. Här ser du hela berättelsen på en gång.",
    ),
  },
  {
    id: "granska",
    name: t("Granska"),
    text: t(
      "Granska samlar kommentarer och det texten kan behöva: upprepningar, filterord och stavning i kapitlet du skriver.",
    ),
  },
  {
    id: "publicera",
    name: t("Publicera"),
    text: t(
      "Välj utseende under Design, fyll i Bokuppgifter och exportera som manus, e-bok eller tryck-PDF.",
    ),
  },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

export const guide = createGuide(STEPS, "skrivro.guide");

export const restartGuide = guide.restart;
