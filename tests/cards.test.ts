import { describe, expect, it } from "vitest";
import {
  cardsOf,
  chapterLabel,
  countMentions,
  entriesIn,
  mentionPattern,
} from "../src/project/cards";
import {
  CHARACTERS_ID,
  PLACES_ID,
  TIMELINE_ID,
  withSpecialFolders,
  type TreeNode,
} from "../src/project/tree";

const tree: TreeNode[] = withSpecialFolders([
  { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "koket", kind: "scene" }] },
  {
    id: CHARACTERS_ID,
    kind: "folder",
    children: [
      { id: "arvid", kind: "scene" },
      {
        id: "familjen",
        kind: "folder",
        title: "Familjen",
        children: [{ id: "elin", kind: "scene" }],
      },
    ],
  },
  { id: PLACES_ID, kind: "folder", children: [{ id: "udden", kind: "scene" }] },
]);
const summary = (title: string) => ({ title, words: 10, status: "idé" as const });
const summaries = {
  koket: summary("Köket"),
  arvid: summary("Arvid"),
  elin: summary("Elin Berg"),
  udden: summary("Udden"),
};

describe("cardsOf", () => {
  it("makes a card of every scene in Karaktärer and Platser, subfolders too, named by its title", () => {
    const cards = cardsOf(tree, summaries);

    expect(cards).toEqual([
      { id: "arvid", kind: "person", name: "Arvid" },
      { id: "elin", kind: "person", name: "Elin Berg" },
      { id: "udden", kind: "plats", name: "Udden" },
    ]);
  });

  it("leaves out a scene whose file is not here yet", () => {
    const cards = cardsOf(tree, { arvid: summary("Arvid") });

    expect(cards.map((card) => card.name)).toEqual(["Arvid"]);
  });
});

describe("countMentions", () => {
  const arvid = { id: "arvid", kind: "person" as const, name: "Arvid" };
  const elin = { id: "elin", kind: "person" as const, name: "Elin" };
  const scenes = {
    koket: "Arvid såg upp. Elin satte sig. Arvids händer skakade.",
    isen: "Elinor var inte Elin.",
    fyren: "Ingen här.",
  };

  it("counts the name as a whole word, with the Swedish genitive s", () => {
    const mentions = countMentions([arvid, elin], scenes);

    expect(mentions.get("arvid")).toEqual({ count: 2, sceneIds: ["koket"] });
    expect(mentions.get("elin")).toEqual({ count: 2, sceneIds: ["koket", "isen"] });
  });

  it("finds nothing for an empty name", () => {
    const pattern = mentionPattern("  ");

    expect(pattern).toBeNull();
  });
});

describe("chapterLabel", () => {
  it("writes runs as ranges and the rest as a list, as the design does", () => {
    const labels = [
      chapterLabel([1, 2, 3, 4, 5, 6, 7, 8]),
      chapterLabel([1, 2, 5, 8]),
      chapterLabel([]),
    ];

    expect(labels).toEqual(["Kap. 1–8", "Kap. 1, 2, 5, 8", "Inte i manuset än"]);
  });
});

describe("entriesIn", () => {
  it("lists a planning folder's texts in tree order, which is the timeline's order", () => {
    const timeline = withSpecialFolders([
      {
        id: TIMELINE_ID,
        kind: "folder",
        children: [
          { id: "isen", kind: "scene" },
          { id: "brevet", kind: "scene" },
        ],
      },
    ]);
    const titles = {
      isen: summary("1987: Henrik går ut på isen"),
      brevet: summary("2007: Brevet"),
    };

    const entries = entriesIn(timeline, titles, TIMELINE_ID);

    expect(entries.map((entry) => entry.title)).toEqual([
      "1987: Henrik går ut på isen",
      "2007: Brevet",
    ]);
  });
});
