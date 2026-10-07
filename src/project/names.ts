import { t } from "../i18n/i18n.js";

/** Common names from one place and time, for a person who has none yet. */
export interface NameSet {
  id: string;
  label: string;
  first: string[];
  last: string[];
}

// Written as one line each, so a list is easy to read and to add to.
const words = (line: string) => line.split(" ");

const SWEDISH_LAST = words(
  "Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Lindqvist Berg Lundgren Holm Ek Sandberg Forsberg",
);

export const NAME_SETS: NameSet[] = [
  {
    id: "sv-nu",
    label: t("Svenska, i dag"),
    first: words(
      "Maja Alice Wilma Saga Ebba Selma Alva Stella Liam Noah Hugo Elias Theo Vincent Leo Melvin",
    ),
    last: SWEDISH_LAST,
  },
  {
    id: "sv-forr",
    label: t("Svenska, runt 1900"),
    first: words(
      "Karin Elsa Greta Signe Märta Astrid Ingrid Margit Karl Gustav Axel Nils Olof Gunnar Harald Einar",
    ),
    last: SWEDISH_LAST,
  },
  {
    id: "en",
    label: t("Engelska"),
    first: words(
      "Charlotte Harriet Grace Lucy Florence Eleanor Edith Rose James Thomas Edward Henry George Arthur Samuel Albert",
    ),
    last: words("Smith Jones Taylor Brown Wilson Evans Roberts Walker Wright Hughes Turner Carter"),
  },
  {
    id: "nordisk",
    label: t("Norska och danska"),
    first: words(
      "Ingrid Sigrid Kari Liv Freja Mette Solveig Ragnhild Lars Bjørn Mads Jens Ole Torbjørn Asger Knud",
    ),
    last: words(
      "Hansen Johansen Olsen Larsen Andersen Pedersen Nielsen Jensen Haugen Berg Dahl Lund",
    ),
  },
  {
    id: "de",
    label: t("Tyska"),
    first: words(
      "Anna Greta Lena Klara Lotte Marie Hedwig Ilse Felix Paul Lukas Jonas Friedrich Karl Otto Wilhelm",
    ),
    last: words(
      "Müller Schmidt Schneider Fischer Weber Wagner Becker Hoffmann Schulz Koch Richter Krüger",
    ),
  },
];

/** The set that fits the book's language, Swedish of today when none does. */
export function nameSetFor(language: string): NameSet {
  const id = { "en-GB": "en", "nb-NO": "nordisk", "da-DK": "nordisk", "de-DE": "de" }[language];
  return NAME_SETS.find((set) => set.id === id) ?? (NAME_SETS[0] as NameSet);
}

const pick = (names: string[], random: () => number) =>
  names[Math.floor(random() * names.length)] ?? "";

/** A few full names, none twice; `random` is Math.random but steady in tests. */
export function suggestNames(set: NameSet, count: number, random = Math.random): string[] {
  const names = new Set<string>();
  for (let tries = 0; names.size < count && tries < count * 10; tries++) {
    names.add(`${pick(set.first, random)} ${pick(set.last, random)}`);
  }
  return [...names];
}
