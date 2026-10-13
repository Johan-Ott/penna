import { describe, expect, it } from "vitest";
import { withBookField } from "../src/project/bookFields";
import { withNamedLabel, withPieces } from "../src/project/bookSettings";
import { labelsOf } from "../src/project/labels";
import { sortsOf, type TreeNode } from "../src/project/tree";

const chapter: TreeNode = { id: "kap1", kind: "chapter", title: "Kroppen", children: [] };
const book = () => ({ fields: { title: "Vardhavn" } as Record<string, unknown>, tree: [chapter] });

describe("withBookField", () => {
  it("reads a goal written with a space between the thousands", () => {
    const fields = withBookField({}, "totalmål", "115 000");

    expect(fields["totalGoal"]).toBe(115000);
  });

  it("reads how the book is told from voice, tense and deep", () => {
    const fields = withBookField({}, "röst", "jag, dåtid, djup");

    expect(fields["narration"]).toEqual({ voice: "jag", tense: "dåtid", deep: true });
  });

  it("names the fields there are when the field is unknown", () => {
    expect(() => withBookField({}, "färg", "röd")).toThrow(/titel, totalmål/);
  });
});

describe("withNamedLabel", () => {
  it("makes a label the first time its name is used and reuses it after that", () => {
    const once = withNamedLabel(book(), "kap1", "Ledtråd", true);
    const twice = withNamedLabel(once, "kap1", "ledtråd", true);

    const named = labelsOf(twice.fields).filter((label) => label.name === "Ledtråd");
    expect(named).toHaveLength(1);
    expect(twice.tree[0]?.labels).toEqual([named[0]?.id]);
  });

  it("takes a label off a node", () => {
    const labelled = withNamedLabel(book(), "kap1", "Ledtråd", true);

    const off = withNamedLabel(labelled, "kap1", "Ledtråd", false);

    expect(off.tree[0]?.labels).toBeUndefined();
  });
});

describe("withPieces", () => {
  it("adds a piece's sorts and labels to a book that already exists, once", () => {
    const once = withPieces(book(), ["deckare"]);
    const twice = withPieces(once, ["deckare", "romans"]);

    const sorts = sortsOf(twice.tree).map((sort) => sort.title);
    expect(sorts.filter((title) => title === "Misstänkta")).toHaveLength(1);
    expect(sorts).toContain("Relationen");
    expect(labelsOf(twice.fields).map((label) => label.name)).toContain("Falskt spår");
    expect(twice.tree[0]).toEqual(chapter);
  });

  it("names the pieces there are when one is unknown", () => {
    expect(() => withPieces(book(), ["vampyr"])).toThrow(/deckare/);
  });
});
