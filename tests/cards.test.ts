import { describe, expect, it } from "vitest";
import { cardsOf, chapterRuns, countMentions, mentionPattern } from "../src/project/cards";
import {
  CHARACTERS_ID,
  NOTES_ID,
  PLACES_ID,
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
  { id: PLACES_ID, kind: "sort", children: [{ id: "udden", kind: "scene" }] },
  {
    id: NOTES_ID,
    kind: "sort",
    children: [
      { id: "slutet", kind: "scene" },
      { id: "brevet", kind: "scene" },
    ],
  },
]);
const summary = (title: string, link?: boolean) => ({
  title,
  words: 10,
  status: "idé" as const,
  ...(link === undefined ? {} : { link }),
});
const summaries = {
  koket: summary("Köket"),
  arvid: summary("Arvid"),
  elin: summary("Elin Berg"),
  udden: summary("Udden", false),
  slutet: summary("Idéer om slutet"),
  brevet: summary("Brevet", true),
};

describe("cardsOf", () => {
  it("links every note's name in the text, but Övrigt only when the note asks", () => {
    const cards = cardsOf(tree, summaries);

    expect(cards).toEqual([
      { id: "arvid", sortId: CHARACTERS_ID, name: "Arvid" },
      { id: "elin", sortId: CHARACTERS_ID, name: "Elin Berg" },
      { id: "brevet", sortId: NOTES_ID, name: "Brevet" },
    ]);
  });

  it("leaves out a scene whose file is not here yet", () => {
    const cards = cardsOf(tree, { arvid: summary("Arvid") });

    expect(cards.map((card) => card.name)).toEqual(["Arvid"]);
  });
});

describe("countMentions", () => {
  const arvid = { id: "arvid", sortId: CHARACTERS_ID, name: "Arvid" };
  const elin = { id: "elin", sortId: CHARACTERS_ID, name: "Elin" };
  const scenes = {
    koket: "Arvid såg upp. Elin satte sig. Arvids händer skakade.",
    isen: "Elinor var inte Elin.",
    fyren: "Ingen här.",
  };

  it("counts the name as a whole word, with the Swedish genitive s", () => {
    const mentions = countMentions([arvid, elin], scenes);

    expect(mentions.get("arvid")).toMatchObject({ count: 2, sceneIds: ["koket"] });
    expect(mentions.get("elin")).toMatchObject({ count: 2, sceneIds: ["koket", "isen"] });
  });

  it("keeps the first sentence in each scene where the name is said, for Nämns i", () => {
    const mentions = countMentions([arvid, elin], scenes);

    expect(mentions.get("arvid")?.sentences).toEqual({ koket: "Arvid såg upp." });
    expect(mentions.get("elin")?.sentences).toEqual({
      koket: "Elin satte sig.",
      isen: "Elinor var inte Elin.",
    });
  });

  it("finds nothing for an empty name", () => {
    const pattern = mentionPattern("  ");

    expect(pattern).toBeNull();
  });
});

describe("chapterRuns", () => {
  it("writes runs as ranges and the rest as a list, as the design does", () => {
    const labels = [
      chapterRuns([1, 2, 3, 4, 5, 6, 7, 8]),
      chapterRuns([8, 1, 2, 5, 2]),
      chapterRuns([]),
    ];

    expect(labels).toEqual(["1–8", "1, 2, 5, 8", ""]);
  });
});
