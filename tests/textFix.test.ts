import { describe, expect, it } from "vitest";
import { fixedSceneText } from "../src/editor/textFix";

const scene = (body: string) => `---\nid: 01J9Z4K2QX\ntitle: Köket\n---\n${body}`;

describe("fixedSceneText", () => {
  it("replaces the words where they stand, keeping the marks and the front matter", () => {
    const text = scene("Kuvertet var *gult* av ålder.\n\nHon satte sig.\n");
    const anchor = { quote: "gult", prefix: "Kuvertet var ", suffix: " av ålder." };

    expect(fixedSceneText(text, anchor, "gulnat")).toBe(
      scene("Kuvertet var *gulnat* av ålder.\n\nHon satte sig.\n"),
    );
  });

  it("picks the occurrence whose surroundings match", () => {
    const text = scene("Hon gick. Han gick.\n");
    const anchor = { quote: "gick", prefix: "Han ", suffix: "." };

    expect(fixedSceneText(text, anchor, "stannade")).toBe(scene("Hon gick. Han stannade.\n"));
  });

  it("gives null when the words were changed meanwhile", () => {
    const anchor = { quote: "gult", prefix: "", suffix: "" };

    expect(fixedSceneText(scene("Kuvertet var vitt.\n"), anchor, "gulnat")).toBeNull();
  });
});
