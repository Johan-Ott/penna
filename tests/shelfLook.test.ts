import { describe, expect, it } from "vitest";
import { COVER_LOOKS, coverLookOf } from "../src/project/shelfLook";

describe("coverLookOf", () => {
  it("gives a book the same look wherever its folder lies and wherever it stands", () => {
    const here = coverLookOf("C:/Users/Elin/Documents/Skrivro/Isen.penna");

    const moved = coverLookOf("D:/Böcker/Isen.penna");

    expect(moved).toBe(here);
    expect(COVER_LOOKS).toContain(here);
  });

  it("spreads books over the looks", () => {
    const titles = ["Isen", "Vintervägen", "Vardhavn 1", "Fyren", "Stormen", "Brevet"];

    const looks = new Set(titles.map((title) => coverLookOf(`/Skrivro/${title}.penna`)));

    expect(looks.size).toBeGreaterThan(1);
  });
});
