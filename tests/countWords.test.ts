import { describe, expect, it } from "vitest";
import { countWords } from "../src/countWords";

describe("countWords", () => {
  it("counts each Swedish word once", () => {
    const text = "Brevet låg på köksbordet.";

    const count = countWords(text);

    expect(count).toBe(4);
  });

  it("does not count a dialogue dash as a word", () => {
    const text = "– Det kom i morse, sa Arvid.";

    const count = countWords(text);

    expect(count).toBe(6);
  });

  it("counts an empty text as zero words", () => {
    const count = countWords("");

    expect(count).toBe(0);
  });
});
