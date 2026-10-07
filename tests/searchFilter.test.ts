import { describe, expect, it } from "vitest";
import { isKept } from "../src/app/searchFilter";
import type { Project } from "../src/app/useProject";

const project = {
  tree: [
    { id: "S1", kind: "scene", labels: ["elin"] },
    { id: "S2", kind: "scene" },
  ],
  summaries: { S1: { status: "utkast" }, S2: { status: "klar" } },
} as unknown as Project;

describe("search chips", () => {
  it("keep every scene when none is chosen", () => {
    expect(isKept(project, "S2", [])).toBe(true);
  });

  it("keep a scene in either step chosen, and only with a chosen label too", () => {
    expect(isKept(project, "S2", ["status:utkast", "status:klar"])).toBe(true);
    expect(isKept(project, "S1", ["status:utkast", "label:elin"])).toBe(true);
    expect(isKept(project, "S2", ["status:klar", "label:elin"])).toBe(false);
  });
});
