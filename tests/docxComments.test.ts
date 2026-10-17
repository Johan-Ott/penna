import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { docxComments } from "../src/import/docxComments";

async function wordFile(document: string, comments: string) {
  const zip = new JSZip();
  zip.file("word/document.xml", `<w:document><w:body>${document}</w:body></w:document>`);
  zip.file("word/comments.xml", `<w:comments>${comments}</w:comments>`);
  return zip.generateAsync({ type: "uint8array" });
}

const paragraph = (inner: string) => `<w:p>${inner}</w:p>`;
const run = (text: string) => `<w:r><w:t xml:space="preserve">${text}</w:t></w:r>`;

describe("docxComments", () => {
  it("finds each comment's scene, its words and what was written", async () => {
    const docx = await wordFile(
      paragraph(`<w:bookmarkStart w:id="1" w:name="penna_S1"/>${run("Brevet låg där.")}`) +
        paragraph(
          `${run("Isen ")}<w:commentRangeStart w:id="0"/>${run("bar")}<w:commentRangeEnd w:id="0"/>${run(" till fyren.")}`,
        ) +
        paragraph(`<w:bookmarkStart w:id="2" w:name="penna_S2"/>${run("Våren kom.")}`),
      `<w:comment w:id="0" w:author="Testläsare &amp; vän"><w:p>${run("Bar den verkligen?")}</w:p></w:comment>`,
    );

    const [comment, ...rest] = await docxComments(docx);

    expect(rest).toHaveLength(0);
    expect(comment).toMatchObject({
      sceneId: "S1",
      quote: "bar",
      prefix: "Brevet låg där.\nIsen ",
      suffix: " till fyren.\n",
      body: "Bar den verkligen?",
      author: "Testläsare & vän",
    });
  });

  it("gives nothing for a file without comments", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document/>");

    expect(await docxComments(await zip.generateAsync({ type: "uint8array" }))).toEqual([]);
  });
});
