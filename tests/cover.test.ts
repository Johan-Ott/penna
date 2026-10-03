import { describe, expect, it } from "vitest";
import { imageSize } from "../src/export/imageSize";
import { findCover, saveCover } from "../src/project/cover";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

// The smallest headers that say what a picture is and how big: PNG's IHDR and a JPEG SOF0.
function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

function jpeg(width: number, height: number) {
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
  const sof0 = [
    0xff,
    0xc0,
    0x00,
    0x0b,
    0x08,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    1,
    0,
  ];
  return new Uint8Array([0xff, 0xd8, ...app0, ...sof0, 0xff, 0xd9]);
}

describe("imageSize", () => {
  it("reads the size of a PNG and a JPEG from their headers", () => {
    const sizes = [imageSize(png(1600, 2560)), imageSize(jpeg(800, 1200))];

    expect(sizes).toEqual([
      { type: "png", width: 1600, height: 2560 },
      { type: "jpeg", width: 800, height: 1200 },
    ]);
  });

  it("knows nothing about other files", () => {
    const size = imageSize(new TextEncoder().encode("inte en bild"));

    expect(size).toBeNull();
  });
});

describe("the cover picture", () => {
  it("is saved in the project folder and found again", async () => {
    const files = createMemoryFileSystem({});

    await saveCover(files, "/bok", png(1600, 2560));
    const cover = await findCover(files, "/bok");

    expect(cover?.fileName).toBe("cover.png");
    expect(cover?.size).toEqual({ type: "png", width: 1600, height: 2560 });
    expect(cover?.bytes).toEqual(png(1600, 2560));
  });

  it("sets the old picture aside in trash/ when a new one is chosen, never deleting it", async () => {
    const files = createMemoryFileSystem({});
    await saveCover(files, "/bok", png(1600, 2560));

    await saveCover(files, "/bok", jpeg(1600, 2560));

    expect((await findCover(files, "/bok"))?.fileName).toBe("cover.jpg");
    expect(await files.list("/bok/trash")).toEqual(["cover.png"]);
    expect(await files.list("/bok")).not.toContain("cover.png");
  });

  it("refuses a file that is not a JPEG or PNG", async () => {
    const files = createMemoryFileSystem({});

    const saving = saveCover(files, "/bok", new TextEncoder().encode("GIF89a"));

    await expect(saving).rejects.toThrow("JPG eller PNG");
  });

  it("is missing until one is chosen", async () => {
    const files = createMemoryFileSystem({ "/bok/project.json": "{}" });

    const cover = await findCover(files, "/bok");

    expect(cover).toBeNull();
  });
});
