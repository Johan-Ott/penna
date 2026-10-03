import { describe, expect, it } from "vitest";
import { differingExcerpts } from "../src/manuscript/compare";

describe("differingExcerpts", () => {
  it("shows the words around the first difference in both versions", () => {
    const mine = "Hon satte sig. Utanför fönstret hade isen lagt sig över viken, grå och orörlig.";
    const theirs = "Hon satte sig. Utanför fönstret hade isen lagt sig över viken, tung och grå.";

    const excerpts = differingExcerpts(mine, theirs);

    expect(excerpts.mine).toBe("…isen lagt sig över viken, grå och orörlig.");
    expect(excerpts.theirs).toBe("…isen lagt sig över viken, tung och grå.");
  });

  it("starts at the beginning when the texts differ at once", () => {
    const excerpts = differingExcerpts("Brevet låg där.", "Kuvertet låg där.");

    expect(excerpts).toEqual({ mine: "Brevet låg där.", theirs: "Kuvertet låg där." });
  });

  it("cuts a long tail", () => {
    const tail = " och".repeat(40);

    const excerpts = differingExcerpts(`Ett${tail}`, `Två${tail}`);

    expect(excerpts.mine.endsWith("…")).toBe(true);
    expect(excerpts.mine.length).toBeLessThanOrEqual(81);
  });
});
