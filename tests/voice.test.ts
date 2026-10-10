import { describe, expect, it } from "vitest";
import { linesOf } from "../src/manuscript/voice";

describe("linesOf", () => {
  const scenes = [
    {
      sceneId: "one",
      text: "– Det kom i morse, sa Arvid.\n– Vem? frågade Elin.\nArvid sa ingenting.\n– Brevet, Arvid sa det tyst.",
    },
    { sceneId: "two", text: "– Gå hem, sa Arvidsson." },
  ];

  it("finds the lines tagged with the first name, in order", () => {
    expect(linesOf("Arvid Holm", scenes)).toEqual([
      { sceneId: "one", line: "– Det kom i morse, sa Arvid." },
      { sceneId: "one", line: "– Brevet, Arvid sa det tyst." },
    ]);
  });

  it("leaves narration and longer names that start the same", () => {
    expect(linesOf("Elin", scenes).map((found) => found.line)).toEqual(["– Vem? frågade Elin."]);
  });
});
