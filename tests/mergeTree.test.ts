import { describe, expect, it } from "vitest";
import type { TreeNode } from "../src/project/tree";
import { mergeTrees } from "../src/sync/mergeTree";

const scene = (id: string, more: Partial<TreeNode> = {}): TreeNode => ({
  id,
  kind: "scene",
  ...more,
});
const chapter = (id: string, title: string, children: TreeNode[]): TreeNode => ({
  id,
  kind: "chapter",
  title,
  children,
});

const BREVET = chapter("K1", "Brevet", [scene("S1"), scene("S2")]);
const FYREN = chapter("K2", "Fyren", [scene("S3")]);
const BASE = [BREVET, FYREN];

describe("mergeTrees", () => {
  it("takes a renamed chapter from one device and a new scene from the other", () => {
    const here = [chapter("K1", "Brevet", [scene("S1"), scene("S2"), scene("S4")]), FYREN];
    const drive = [BREVET, chapter("K2", "Fyrvaktaren", [scene("S3")])];

    const { tree, conflicts } = mergeTrees(BASE, here, drive);

    expect(tree).toEqual([
      chapter("K1", "Brevet", [scene("S1"), scene("S2"), scene("S4")]),
      chapter("K2", "Fyrvaktaren", [scene("S3")]),
    ]);
    expect(conflicts).toEqual([]);
  });

  it("keeps this device's title when both renamed the same chapter, and hands back the other", () => {
    const here = [chapter("K1", "Smältningen", [scene("S1"), scene("S2")]), FYREN];
    const drive = [chapter("K1", "Islossningen", [scene("S1"), scene("S2")]), FYREN];

    const { tree, conflicts } = mergeTrees(BASE, here, drive);

    expect(tree[0]?.title).toBe("Smältningen");
    expect(conflicts).toEqual([
      { id: "K1", field: "title", here: "Smältningen", drive: "Islossningen" },
    ]);
  });

  it("merges two summaries written on the same scene's other fields", () => {
    const here = [
      chapter("K1", "Brevet", [scene("S1", { summary: "Elin väntar." }), scene("S2")]),
      FYREN,
    ];
    const drive = [chapter("K1", "Brevet", [scene("S1", { when: "Januari" }), scene("S2")]), FYREN];

    const { tree } = mergeTrees(BASE, here, drive);

    expect(tree[0]?.children?.[0]).toEqual(
      scene("S1", { summary: "Elin väntar.", when: "Januari" }),
    );
  });

  it("removes what one device removed and the other left alone", () => {
    const drive = [chapter("K1", "Brevet", [scene("S1")]), FYREN];

    const { tree } = mergeTrees(BASE, BASE, drive);

    expect(tree[0]?.children).toEqual([scene("S1")]);
  });

  it("keeps a chapter one device removed when the other changed it", () => {
    const here = [BREVET];
    const drive = [BREVET, chapter("K2", "Fyrvaktaren", [scene("S3")])];

    const { tree } = mergeTrees(BASE, here, drive);

    expect(tree.map((node) => node.id)).toEqual(["K1", "K2"]);
  });

  it("follows a scene moved on the other device", () => {
    const drive = [
      chapter("K1", "Brevet", [scene("S1")]),
      chapter("K2", "Fyren", [scene("S2"), scene("S3")]),
    ];

    const { tree } = mergeTrees(BASE, BASE, drive);

    expect(tree).toEqual(drive);
  });

  it("puts a scene added on the other device after the one it followed there", () => {
    const here = [chapter("K1", "Brevet", [scene("S2"), scene("S1")]), FYREN];
    const drive = [chapter("K1", "Brevet", [scene("S1"), scene("S5"), scene("S2")]), FYREN];

    const { tree } = mergeTrees(BASE, here, drive);

    expect(tree[0]?.children?.map((node) => node.id)).toEqual(["S2", "S1", "S5"]);
  });
});
