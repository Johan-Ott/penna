import { describe, expect, it } from "vitest";
import { newSceneId } from "../src/storage/sceneId";
import { classifySceneFiles } from "../src/storage/syncFiles";

describe("newSceneId", () => {
  it("makes a 26 character ULID that the folder listing recognises", () => {
    const id = newSceneId();

    expect(id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(classifySceneFiles([`${id}.md`]).scenes).toEqual([id]);
  });

  it("sorts later ids after earlier ones", () => {
    const earlier = newSceneId(1_700_000_000_000);
    const later = newSceneId(1_700_000_000_001);

    expect(earlier < later).toBe(true);
  });
});
