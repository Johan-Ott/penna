import { describe, expect, it } from "vitest";
import { parseMarkdown } from "../src/manuscript/parseMarkdown";
import { manuscriptSchema as schema } from "../src/manuscript/schema";
import { serializeMarkdown } from "../src/manuscript/serializeMarkdown";

describe("underline and strikethrough", () => {
  const marksOf = (markdown: string) => {
    const marks: string[] = [];
    parseMarkdown(markdown).descendants((node) => {
      if (node.isText)
        marks.push(`${node.text}:${node.marks.map((mark) => mark.type.name).join("+")}`);
    });
    return marks;
  };

  it("reads <u> and <s> as underline and strikethrough", () => {
    expect(marksOf("Ett <u>viktigt</u> och <s>struket</s> ord.")).toEqual([
      "Ett :",
      "viktigt:underline",
      " och :",
      "struket:strike",
      " ord.:",
    ]);
  });

  it("writes them back as <u> and <s>, also inside italic", () => {
    const underline = schema.marks["underline"]?.create();
    const strike = schema.marks["strike"]?.create();
    const italic = schema.marks["italic"]?.create();
    if (!underline || !strike || !italic) throw new Error("marks missing");
    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, [
        schema.text("Ett "),
        schema.text("viktigt", [underline]),
        schema.text(" och "),
        schema.text("struket", [italic, strike]),
      ]),
    ]);

    const markdown = serializeMarkdown(doc);

    expect(markdown).toBe("Ett <u>viktigt</u> och *<s>struket</s>*\n");
    expect(serializeMarkdown(parseMarkdown(markdown))).toBe(markdown);
  });
});
