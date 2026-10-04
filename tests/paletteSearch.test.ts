import { describe, expect, it } from "vitest";
import { inGroups, searchPalette, type PaletteEntry } from "../src/app/palette/paletteSearch";

const entry = (label: string, group: PaletteEntry["group"] = "Kommandon"): PaletteEntry => ({
  id: label,
  label,
  group,
  run: () => undefined,
});

const ENTRIES = [
  entry("Köket", "Scener"),
  entry("Isen", "Scener"),
  entry("Ny scen"),
  entry("Fokusläge"),
  entry("Större text"),
  entry("Mörkt tema"),
  entry("Brevet", "Kapitel"),
];

const labels = (query: string) => searchPalette(ENTRIES, query).map((found) => found.label);

describe("searchPalette", () => {
  it("lists everything when nothing is typed", () => {
    expect(labels("")).toHaveLength(ENTRIES.length);
  });

  it("finds by the start of a word before a match inside a word", () => {
    expect(labels("te")).toEqual(["Större text", "Mörkt tema"]);
  });

  it("puts a match at the very start first", () => {
    expect(labels("s")[0]).toBe("Större text");
  });

  it("does not care about case or Swedish accents when searching", () => {
    expect(labels("KOKET")).toEqual(["Köket"]);
    expect(labels("fokuslage")).toEqual(["Fokusläge"]);
  });

  it("finds letters in order even with gaps", () => {
    expect(labels("nsc")).toEqual(["Ny scen"]);
  });

  it("finds nothing for letters that are not there", () => {
    expect(labels("xyz")).toEqual([]);
  });
});

describe("searchPalette with short queries", () => {
  it("does not match letters spread over a label when only two are typed", () => {
    expect(labels("is")).toEqual(["Isen"]);
  });
});

describe("inGroups", () => {
  it("shows notes first, then scenes and commands, best first within a group", () => {
    const found = [
      entry("Ny anteckning", "Kommandon"),
      entry("Arvid", "Personer"),
      entry("Köket", "Scener"),
      entry("Udden", "Platser"),
    ];

    const labels = inGroups(found).map((result) => result.label);

    expect(labels).toEqual(["Arvid", "Udden", "Köket", "Ny anteckning"]);
  });
});
