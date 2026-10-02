import { mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  findRecoverableTemps,
  recoverTemp,
  tempPathFor,
  writeAtomic,
} from "../src/storage/atomicWrite";
import { joinPath } from "../src/storage/fileSystem";
import { nodeFileSystem } from "../src/storage/nodeFileSystem";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(joinPath(tmpdir(), "penna-test-"));
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

const scenePath = () => joinPath(dir, "01J9Z4K2QX.md");

describe("writeAtomic", () => {
  it("writes the text and leaves no temp file behind", async () => {
    await writeAtomic(nodeFileSystem, scenePath(), "Brevet låg på köksbordet.");

    expect(await readFile(scenePath(), "utf8")).toBe("Brevet låg på köksbordet.");
    expect(await readdir(dir)).toEqual(["01J9Z4K2QX.md"]);
  });

  it("replaces an existing file", async () => {
    await writeFile(scenePath(), "gammal");

    await writeAtomic(nodeFileSystem, scenePath(), "ny");

    expect(await readFile(scenePath(), "utf8")).toBe("ny");
  });

  it("keeps the old file intact when the rename fails", async () => {
    await writeFile(scenePath(), "gammal");
    const failingRename = { ...nodeFileSystem, rename: () => Promise.reject(new Error("crash")) };

    const attempt = writeAtomic(failingRename, scenePath(), "ny");

    await expect(attempt).rejects.toThrow("crash");
    expect(await readFile(scenePath(), "utf8")).toBe("gammal");
  });
});

describe("findRecoverableTemps", () => {
  it("offers a temp file that is newer than its scene", async () => {
    await writeFile(scenePath(), "sparad");
    await writeFile(tempPathFor(scenePath()), "osparad");
    await utimes(scenePath(), 1000, 1000);

    const found = await findRecoverableTemps(nodeFileSystem, dir);

    expect(found).toEqual([{ tempPath: tempPathFor(scenePath()), targetPath: scenePath() }]);
  });

  it("offers a temp file whose scene is missing", async () => {
    await writeFile(tempPathFor(scenePath()), "osparad");

    const found = await findRecoverableTemps(nodeFileSystem, dir);

    expect(found).toHaveLength(1);
  });

  it("skips a temp file that is older than its scene", async () => {
    await writeFile(tempPathFor(scenePath()), "gammal");
    await writeFile(scenePath(), "nyare");
    await utimes(tempPathFor(scenePath()), 1000, 1000);

    const found = await findRecoverableTemps(nodeFileSystem, dir);

    expect(found).toEqual([]);
  });

  it("returns nothing for a folder that does not exist", async () => {
    const found = await findRecoverableTemps(nodeFileSystem, joinPath(dir, "saknas"));

    expect(found).toEqual([]);
  });
});

describe("recoverTemp", () => {
  it("puts the temp text in place of the scene", async () => {
    await writeFile(scenePath(), "sparad");
    await writeFile(tempPathFor(scenePath()), "osparad");
    const recoverable = { tempPath: tempPathFor(scenePath()), targetPath: scenePath() };

    await recoverTemp(nodeFileSystem, recoverable);

    expect(await readFile(scenePath(), "utf8")).toBe("osparad");
    expect(await readdir(dir)).toEqual(["01J9Z4K2QX.md"]);
  });
});
