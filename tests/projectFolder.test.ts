import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { tempPathFor } from "../src/storage/atomicWrite";
import { joinPath } from "../src/storage/fileSystem";
import { nodeFileSystem } from "../src/storage/nodeFileSystem";
import { openProjectFolder } from "../src/storage/projectFolder";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(joinPath(tmpdir(), "penna-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("openProjectFolder", () => {
  it("lists scenes, conflict copies and recoverable temp files", async () => {
    const scenes = joinPath(dir, "scenes");
    await mkdir(scenes);
    await writeFile(joinPath(scenes, "01J9Z4K2QX.md"), "text");
    await writeFile(joinPath(scenes, "01J9Z4K2QX 2.md"), "kopia");
    await writeFile(tempPathFor(joinPath(scenes, "01J9Z5A1BB.md")), "osparad");

    const project = await openProjectFolder(nodeFileSystem, dir);

    expect(project.scenes).toEqual(["01J9Z4K2QX"]);
    expect(project.conflicts).toEqual([{ sceneId: "01J9Z4K2QX", fileName: "01J9Z4K2QX 2.md" }]);
    expect(project.recoverable.map((temp) => temp.targetPath)).toEqual([
      joinPath(scenes, "01J9Z5A1BB.md"),
    ]);
  });

  it("opens a folder without scenes as an empty project", async () => {
    const project = await openProjectFolder(nodeFileSystem, dir);

    expect(project).toEqual({ scenes: [], conflicts: [], notDownloaded: [], recoverable: [] });
  });
});
