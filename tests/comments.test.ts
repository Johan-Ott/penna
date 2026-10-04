import { describe, expect, it } from "vitest";
import {
  anchorAt,
  locate,
  newComment,
  readComments,
  writeComments,
  type Comment,
} from "../src/project/comments";
import { createMemoryFileSystem } from "../src/storage/memoryFileSystem";

const TEXT = "Brevet låg på köksbordet. Kuvertet var gult av ålder, och handstilen kände hon igen.";

describe("anchorAt", () => {
  it("keeps the quoted words with a little of the text before and after", () => {
    const from = TEXT.indexOf("Kuvertet");
    const to = TEXT.indexOf(", och");

    const anchor = anchorAt(TEXT, from, to);

    expect(anchor.quote).toBe("Kuvertet var gult av ålder");
    expect(anchor.prefix.endsWith("på köksbordet. ")).toBe(true);
    expect(anchor.suffix.startsWith(", och handstilen")).toBe(true);
  });
});

describe("locate", () => {
  const comment: Comment = {
    ...newComment(
      anchorAt(TEXT, TEXT.indexOf("Kuvertet"), TEXT.indexOf(", och")),
      "Vilket år?",
      "Testläsare",
    ),
    id: "k1x",
  };

  it("finds the quote again after the text around it has been edited", () => {
    const edited = `Det var vinter. ${TEXT.replace("köksbordet", "det gamla köksbordet")}`;

    const place = locate(edited, comment);

    expect(place && edited.slice(place.from, place.to)).toBe("Kuvertet var gult av ålder");
  });

  it("picks the right one when the quote is in the text twice, by the words around it", () => {
    const twice = `Kuvertet var gult av ålder, sa han. ${TEXT}`;

    const place = locate(twice, comment);

    expect(place?.from).toBe(twice.lastIndexOf("Kuvertet"));
  });

  it("says when the quote is gone, so the comment can be shown as not placed", () => {
    const place = locate("Brevet låg på köksbordet.", comment);

    expect(place).toBeNull();
  });
});

describe("comment files", () => {
  it("keep a scene's comments in comments/<scene id>.json and read them back", async () => {
    const files = createMemoryFileSystem({});
    const comment = { ...newComment(anchorAt(TEXT, 0, 6), "Bra början.", "Elin"), id: "k1x" };

    await writeComments(files, "/bok", "01KOKET", [comment]);

    expect(await readComments(files, "/bok", "01KOKET")).toEqual([comment]);
    expect(await files.list("/bok/comments")).toEqual(["01KOKET.json"]);
  });

  it("read a scene without comments, or a broken file, as no comments", async () => {
    const files = createMemoryFileSystem({ "/bok/comments/01ISEN.json": "[{ trasig" });

    const comments = [
      await readComments(files, "/bok", "01KOKET"),
      await readComments(files, "/bok", "01ISEN"),
    ];

    expect(comments).toEqual([[], []]);
    const names = await files.list("/bok/comments");
    expect(names.some((name) => name.startsWith("01ISEN.json.trasig-"))).toBe(true);
  });
});
