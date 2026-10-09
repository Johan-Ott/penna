import { describe, expect, it } from "vitest";
import { MOST_CHARACTERS, shortened } from "../src/app/share/excerptImage";

describe("shortened", () => {
  it("keeps a short excerpt whole and cuts a long one at a word, within the limit", () => {
    const long = Array.from({ length: 80 }, () => "isen").join(" ");

    expect(shortened("Hon log.")).toBe("Hon log.");
    expect(shortened(long).length).toBeLessThanOrEqual(MOST_CHARACTERS + 1);
    expect(shortened(long).endsWith("isen…")).toBe(true);
  });
});
