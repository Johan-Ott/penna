import { describe, expect, it } from "vitest";
import {
  joinSceneFile,
  newSceneText,
  sceneTitle,
  withSceneTitle,
  sceneStatus,
  withSceneStatus,
  splitSceneFile,
} from "../src/manuscript/sceneFile";

const SCENE = "---\nid: 01J9Z4K2QX\ntitle: Köket\nstatus: utkast\n---\nBrevet låg på köksbordet.\n";

describe("scene titles", () => {
  it("reads the title from the front matter", () => {
    const title = sceneTitle(splitSceneFile(SCENE).frontMatter);

    expect(title).toBe("Köket");
  });

  it("writes a new scene that reads back with its id and title", () => {
    const text = newSceneText("01J9Z4K2QX", "Köket: del 2");

    const title = sceneTitle(splitSceneFile(text).frontMatter);

    expect(title).toBe("Köket: del 2");
    expect(text).toContain("id: 01J9Z4K2QX\n");
    expect(splitSceneFile(text).body).toBe("");
  });

  it("returns null when the scene has no title", () => {
    const title = sceneTitle("");

    expect(title).toBeNull();
  });
});

describe("splitSceneFile", () => {
  it("separates the front matter from the prose", () => {
    const parts = splitSceneFile(SCENE);

    expect(parts.frontMatter).toBe("---\nid: 01J9Z4K2QX\ntitle: Köket\nstatus: utkast\n---\n");
    expect(parts.body).toBe("Brevet låg på köksbordet.\n");
  });

  it("joins the parts back into the same file", () => {
    const parts = splitSceneFile(SCENE);

    const joined = joinSceneFile(parts);

    expect(joined).toBe(SCENE);
  });

  it("treats a file without front matter as all prose", () => {
    const parts = splitSceneFile("Bara text.\n");

    expect(parts).toEqual({ frontMatter: "", body: "Bara text.\n" });
  });

  it("treats an unclosed front matter fence as prose", () => {
    const parts = splitSceneFile("---\nid: 1\nBrevet.\n");

    expect(parts.frontMatter).toBe("");
  });
});

describe("withSceneTitle", () => {
  it("replaces the title and keeps the other front matter lines", () => {
    const frontMatter = splitSceneFile(SCENE).frontMatter;

    const renamed = withSceneTitle(frontMatter, "Köksbordet");

    expect(renamed).toBe("---\nid: 01J9Z4K2QX\ntitle: Köksbordet\nstatus: utkast\n---\n");
  });

  it("adds a title line when the scene has none", () => {
    const renamed = withSceneTitle("---\nid: 1\n---\n", "Isen");

    expect(sceneTitle(renamed)).toBe("Isen");
  });

  it("adds front matter to a scene that has none", () => {
    const renamed = withSceneTitle("", "Isen");

    expect(sceneTitle(renamed)).toBe("Isen");
    expect(splitSceneFile(`${renamed}Text.`).body).toBe("Text.");
  });
});

describe("scene status", () => {
  it("reads the status from the front matter, with idé when there is none", () => {
    expect(sceneStatus(splitSceneFile(SCENE).frontMatter)).toBe("utkast");
    expect(sceneStatus("")).toBe("idé");
  });

  it("writes a new status and keeps the other lines", () => {
    const frontMatter = splitSceneFile(SCENE).frontMatter;

    const changed = withSceneStatus(frontMatter, "klar");

    expect(changed).toBe("---\nid: 01J9Z4K2QX\ntitle: Köket\nstatus: klar\n---\n");
  });

  it("adds a status line to front matter that has none", () => {
    expect(sceneStatus(withSceneStatus("---\nid: 1\n---\n", "redigering"))).toBe("redigering");
  });
});
