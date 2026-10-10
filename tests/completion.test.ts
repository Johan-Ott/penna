import { describe, expect, it } from "vitest";
import { completionFor } from "../src/editor/completion";

describe("completionFor", () => {
  const words = ["Arvid", "Arvid Holm", "fyrvaktaren"];

  it("offers the rest of the first word that begins the same, in any case", () => {
    expect(completionFor("Arv", words)).toBe("id");
    expect(completionFor("fyrv", words)).toBe("aktaren");
    expect(completionFor("FYRV", words)).toBe("aktaren");
  });

  it("waits for three letters, and offers nothing for a word already whole", () => {
    expect(completionFor("Ar", words)).toBeNull();
    expect(completionFor("fyrvaktaren", words)).toBeNull();
  });
});
