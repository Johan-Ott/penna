import { describe, expect, it } from "vitest";
import { bookOutline } from "../src/export/book";
import { DEFAULT_DESIGN } from "../src/export/bookDesign";
import { OPENING_PRESETS, type OpeningTemplate } from "../src/export/openings";
import { picturesUsed, readPictures, savePicture } from "../src/project/pictures";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const PNG_HEADER = [
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52,
];
const picture = () => {
  const bytes = new Uint8Array(33);
  bytes.set(PNG_HEADER);
  new DataView(bytes.buffer).setUint32(16, 40);
  new DataView(bytes.buffer).setUint32(20, 20);
  return bytes;
};

describe("the book's pictures", () => {
  it("are kept in bilder/ under a new name and read back from there", async () => {
    const files = createMemoryFileSystem({});

    const name = await savePicture(files, "/bok", picture());
    const found = await readPictures(files, "/bok", [name, "saknas.png"]);

    expect(name).toMatch(/^\w+\.png$/);
    expect([...found.keys()]).toEqual([name]);
  });

  it("refuse anything but JPG and PNG", async () => {
    const files = createMemoryFileSystem({});

    const saving = savePicture(files, "/bok", new TextEncoder().encode("inte en bild"));

    await expect(saving).rejects.toThrow("JPG eller PNG");
  });

  it("are the templates', the scene break's and every chapter's own, each once", () => {
    const outline = bookOutline([
      { id: "k1", kind: "chapter", title: "Ett", pictures: { bild1: "karta.png" } },
      { id: "k2", kind: "chapter", title: "Två", pictures: { bild1: "rosett.png" } },
    ]);
    const area = { id: "bild1", picture: "rosett.png", x: 0, y: 0, width: 1, height: 0.3 };
    const template: OpeningTemplate = {
      ...OPENING_PRESETS[0],
      areas: [{ ...area, fit: "fyll" }],
    } as OpeningTemplate;

    const names = picturesUsed(
      { ...DEFAULT_DESIGN, openings: [template], breakPicture: "stjarna.png" },
      outline,
    );

    expect(names).toEqual(["stjarna.png", "rosett.png", "karta.png"]);
  });
});
