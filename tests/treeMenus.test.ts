import { describe, expect, it } from "vitest";
import { addMenu, rowMenu, type TreeMenuActions } from "../src/app/tree/treeMenus";
import { RESEARCH_ID, TRASH_ID, type TreeNode } from "../src/project/tree";

const noop = () => undefined;
const actions: TreeMenuActions = {
  open: noop,
  add: noop,
  rename: noop,
  trash: noop,
  restore: noop,
  setStatus: noop,
  statusOf: () => "utkast",
  showSnapshots: () => undefined,
};
const labels = (items: ReturnType<typeof rowMenu>) =>
  items.map((item) => (item.separatorBefore ? `| ${item.label}` : item.label));

const node = (kind: TreeNode["kind"], id = "x"): TreeNode => ({ id, kind });

describe("tree menus", () => {
  it("offers the same four new items from the add button and empty space", () => {
    expect(addMenu(actions).map((item) => item.label)).toEqual([
      "Ny scen",
      "Nytt kapitel",
      "Ny del",
      "Ny mapp",
    ]);
  });

  it("gives a scene a complete menu", () => {
    expect(labels(rowMenu(node("scene"), false, actions))).toEqual([
      "Öppna",
      "Ögonblicksbilder…",
      "| Ny scen efter",
      "Nytt kapitel efter",
      "| Status: Idé",
      "Status: Utkast",
      "Status: Redigering",
      "Status: Klar",
      "| Byt namn",
      "Flytta till papperskorg",
    ]);
  });

  it("checks the status the scene has", () => {
    const items = rowMenu(node("scene"), false, actions);

    expect(items.filter((item) => item.isChecked).map((item) => item.label)).toEqual([
      "Status: Utkast",
    ]);
  });

  it("adds new things inside a chapter, a part and a folder", () => {
    expect(labels(rowMenu(node("chapter"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i kapitlet",
      "Nytt kapitel efter",
    ]);
    expect(labels(rowMenu(node("part"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i delen",
      "Nytt kapitel i delen",
    ]);
    expect(labels(rowMenu(node("folder"), false, actions)).slice(0, 2)).toEqual([
      "Ny scen i mappen",
      "Ny mapp i mappen",
    ]);
  });

  it("lets Research hold new scenes and folders but never be renamed or trashed", () => {
    expect(labels(rowMenu(node("folder", RESEARCH_ID), false, actions))).toEqual([
      "Ny scen i mappen",
      "Ny mapp i mappen",
    ]);
  });

  it("offers nothing on Papperskorg itself and only a way back for things in it", () => {
    expect(rowMenu(node("folder", TRASH_ID), false, actions)).toEqual([]);
    expect(labels(rowMenu(node("scene"), true, actions))).toEqual(["Lägg tillbaka i manuset"]);
  });

  it("shows the keyboard shortcuts", () => {
    const items = rowMenu(node("scene"), false, actions);

    expect(items.find((item) => item.label === "Byt namn")?.shortcut).toBe("F2");
    expect(items.find((item) => item.label === "Flytta till papperskorg")?.shortcut).toBe("Delete");
  });
});
