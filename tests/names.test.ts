import { describe, expect, it } from "vitest";
import { NAME_SETS, nameSetFor, suggestNames } from "../src/project/names";

describe("name suggestions", () => {
  it("follow the book's language, Swedish of today otherwise", () => {
    expect(nameSetFor("da-DK").id).toBe("nordisk");
    expect(nameSetFor("fi-FI").id).toBe("sv-nu");
  });

  it("give full names from the set, none twice", () => {
    let seed = 0;
    const steady = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const set = NAME_SETS.find((each) => each.id === "sv-forr") ?? nameSetFor("sv-SE");

    const names = suggestNames(set, 4, steady);

    expect(new Set(names).size).toBe(4);
    for (const name of names) {
      const [first, last] = name.split(" ");
      expect(set.first).toContain(first);
      expect(set.last).toContain(last);
    }
  });
});
