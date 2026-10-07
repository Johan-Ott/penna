import { describe, expect, it } from "vitest";
import { earlyMentions, secretsKnownBy, secretsOf } from "../src/project/secrets";
import { SECRETS_ID, withSpecialFolders, type TreeNode } from "../src/project/tree";

const tree: TreeNode[] = withSpecialFolders([
  {
    id: "kap",
    kind: "chapter",
    children: [
      { id: "ett", kind: "scene" },
      { id: "tva", kind: "scene" },
      { id: "tre", kind: "scene" },
    ],
  },
]).map((node) =>
  node.id === SECRETS_ID
    ? {
        ...node,
        children: [
          { id: "brevet", kind: "scene", reveal: "tre", knownBy: { elin: "tva", arvid: "ett" } },
        ],
      }
    : node,
);
const summaries = { brevet: { title: "Henrik lever", words: 0, status: "idé" } } as never;

describe("secrets", () => {
  it("are read from Hemligheter with when the reader and each person learn them", () => {
    expect(secretsOf(tree, summaries)).toEqual([
      { id: "brevet", name: "Henrik lever", reveal: "tre", knownBy: { elin: "tva", arvid: "ett" } },
    ]);
  });

  it("tell what a person knows, from which scene", () => {
    const known = secretsKnownBy(tree, secretsOf(tree, summaries), "elin");

    expect(known.map((each) => [each.secret.name, each.from])).toEqual([["Henrik lever", "tva"]]);
  });

  it("find a mention before the reveal, but not one after it", () => {
    const [secret] = secretsOf(tree, summaries);

    expect(secret && earlyMentions(tree, secret, ["ett", "tre"])).toEqual(["ett"]);
  });
});
