import { describe, expect, it } from "vitest";
import { bookLanguage, quoteStyleFor } from "../src/project/bookLanguage";

describe("bookLanguage", () => {
  it("reads the book's language, and is Swedish when it is missing or unknown", () => {
    expect(bookLanguage({ language: "en-GB" })).toBe("en-GB");
    expect(bookLanguage({})).toBe("sv-SE");
    expect(bookLanguage({ language: "--lang=x" })).toBe("sv-SE");
  });
});

describe("quoteStyleFor", () => {
  it("keeps Swedish quotes for Swedish and Finnish books, and opens with “ in the others", () => {
    expect(["sv-SE", "fi-FI", "en-GB", "de-DE"].map(quoteStyleFor)).toEqual([
      "svensk",
      "svensk",
      "engelsk",
      "engelsk",
    ]);
  });
});
