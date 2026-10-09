import { describe, expect, it } from "vitest";
import { barRuns, ean13Modules, isbn13 } from "../src/export/barcode";

describe("the EAN-13 barcode", () => {
  it("reads an ISBN-13 with its check digit, and turns an ISBN-10 into one", () => {
    expect(isbn13("978-91-7343-555-0")).toBe("9789173435550");
    expect(isbn13("978-91-7343-555-6")).toBeNull();
    expect(isbn13("0-306-40615-2")).toBe("9780306406157");
    expect(isbn13("12345")).toBeNull();
  });

  it("has 95 modules between its guards, as the standard draws 9780306406157", () => {
    const modules = ean13Modules("9780306406157");

    expect(modules).toHaveLength(95);
    expect(modules.slice(0, 3)).toBe("101");
    expect(modules.slice(45, 50)).toBe("01010");
    expect(modules.slice(92)).toBe("101");
    expect(modules.slice(3, 10)).toBe("0111011");
  });

  it("gives each run of bars its start and width", () => {
    expect(barRuns("1011100")).toEqual([
      [0, 1],
      [2, 3],
    ]);
  });
});
