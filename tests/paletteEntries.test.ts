import { describe, expect, it } from "vitest";
import type { Project } from "../src/app/useProject";
import { paletteEntries, type PaletteContext } from "../src/app/palette/paletteEntries";
import { DEFAULT_SETTINGS, type WritingSettings } from "../src/editor/writingSettings";
import { withSpecialFolders } from "../src/project/tree";

function context() {
  const opened: string[] = [];
  let settings: WritingSettings = DEFAULT_SETTINGS;
  const project = {
    tree: withSpecialFolders([
      { id: "kap1", kind: "chapter", title: "Brevet", children: [{ id: "scene1", kind: "scene" }] },
    ]),
    summaries: { scene1: { title: "Köket", words: 10, status: "idé" } },
  } as unknown as Project;
  const value: PaletteContext = {
    project,
    settings,
    openScene: (id) => opened.push(id),
    add: () => undefined,
    run: () => undefined,
    changeSettings: (change) => (settings = change(settings)),
    toggleFocusMode: () => undefined,
    openSearch: () => undefined,
    chooseFolder: () => undefined,
    showShelf: () => undefined,
  };
  return { value, opened, settings: () => settings };
}

describe("paletteEntries", () => {
  it("lists scenes and chapters, and a chapter opens its first scene", () => {
    const { value, opened } = context();
    const entries = paletteEntries(value);

    entries.find((entry) => entry.label === "1. Brevet")?.run();

    expect(entries.filter((entry) => entry.group === "Scener").map((entry) => entry.label)).toEqual(
      ["Köket"],
    );
    expect(opened).toEqual(["scene1"]);
  });

  it("changes the text size from the palette", () => {
    const { value, settings } = context();

    paletteEntries(value)
      .find((entry) => entry.label === "Större text")
      ?.run();

    expect(settings().size).toBe(DEFAULT_SETTINGS.size + 1);
  });

  it("shows the keyboard shortcut next to a command", () => {
    const { value } = context();

    const focus = paletteEntries(value).find((entry) => entry.label === "Fokusläge");

    expect(focus?.shortcut).toBe("Ctrl+Shift+F");
  });
});
