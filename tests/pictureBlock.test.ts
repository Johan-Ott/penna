import { describe, expect, it } from "vitest";
import { sceneTypst } from "../src/export/typstText";
import { sceneXhtml } from "../src/export/xhtml";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { picturesInDocs } from "../src/manuscript/pictures";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

const TEXT =
  'Hon vecklade ut kartan.\n\n![Ön, ritad av Arvid](bilder/karta.png "sida")\n\nDen var gammal.\n';

describe("a picture in the text", () => {
  it("is read from a paragraph holding only an image from bilder/, and written back as it was", () => {
    const doc = parseMarkdown(TEXT);

    expect(doc.child(1).type.name).toBe("picture");
    expect(doc.child(1).attrs).toMatchObject({
      name: "karta.png",
      caption: "Ön, ritad av Arvid",
      size: "sida",
    });
    expect(serializeMarkdown(doc)).toBe(TEXT);
    expect(picturesInDocs([doc])).toEqual(["karta.png"]);
  });

  it("stays text when the image is not one of the book's pictures", () => {
    const doc = parseMarkdown("![logga](https://exempel.se/logga.png)\n");

    expect(doc.child(0).type.name).toBe("paragraph");
  });

  it("is written in the usual form once changed, leaving out the usual size", () => {
    const doc = parseMarkdown(TEXT);
    const picture = doc.child(1);
    const wider = picture.type.create({ ...picture.attrs, size: "bred" });
    const changed = doc.type.create(doc.attrs, [doc.child(0), wider, doc.child(2)]);

    expect(serializeMarkdown(changed)).toContain("\n\n![Ön, ritad av Arvid](bilder/karta.png)\n\n");
  });

  it("is set by Typst when found and left out when not, and shown as a figure in the e-book", () => {
    const doc = parseMarkdown(TEXT);
    const options = { typography: "svensk" as const, hasDropCap: false };

    const found = sceneTypst(doc, { ...options, picturePath: (name) => `/bilder/${name}` });
    const missing = sceneTypst(doc, { ...options, picturePath: () => null });

    expect(found).toContain('#bild("/bilder/karta.png", "sida", "Ön, ritad av Arvid")');
    expect(missing).not.toContain("#bild");
    expect(sceneXhtml(doc, "svensk")).toContain(
      '<img src="../bilder/karta.png" alt="Ön, ritad av Arvid" />',
    );
  });
});
