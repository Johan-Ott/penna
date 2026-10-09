import { describe, expect, it } from "vitest";
import { bookLook, chapterLabel, runningHead } from "../src/app/bookLook";

const texts = { title: "Vintervägen", author: "Johan", chapter: "Brevet" };

describe("book type follows the book's design", () => {
  it("numbers the chapter as the printed book does", () => {
    expect(chapterLabel({}, 8, "Brevet")).toBe("Kapitel 8");
    expect(chapterLabel({ design: { chapterLabel: "romersk" } }, 8, "Brevet")).toBe("VIII");
    expect(chapterLabel({ design: { chapterLabel: "ingen" } }, 8, "Brevet")).toBeNull();
  });

  it("shows the running head once when both pages show the same", () => {
    expect(runningHead({}, texts)).toEqual({ book: "Vintervägen", chapter: "" });
    const design = { headerLeft: "forfattare", headerRight: "kapitel" };
    expect(runningHead({ design }, texts)).toEqual({ book: "Johan", chapter: "Brevet" });
  });

  it("takes the drop cap, title case and scene break from the design", () => {
    expect(bookLook({})).toEqual({ classes: "drop-cap title-vanlig", breakSign: "* * *" });
    const look = bookLook({ design: { dropCap: false, leadIn: true, sceneBreak: "bild" } });
    expect(look).toEqual({ classes: "lead-in title-vanlig break-picture", breakSign: null });
  });
});
