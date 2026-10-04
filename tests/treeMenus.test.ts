import { describe, expect, it } from "vitest";
import { addMenu, rowMenu, type TreeMenuActions } from "../src/app/tree/treeMenus";
import { CHARACTERS_ID, TRASH_ID, type TreeNode } from "../src/project/tree";

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
  linkOf: () => null,
  setLink: noop,
  newNote: noop,
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
      "Versioner…",
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

  it("lets a fixed sort hold new notes but never be renamed or trashed; an own sort can be", () => {
    expect(labels(rowMenu(node("sort", CHARACTERS_ID), false, actions))).toEqual(["Ny anteckning"]);
    expect(labels(rowMenu(node("sort", "fordon"), false, actions))).toEqual([
      "Ny anteckning",
      "| Byt namn",
      "Flytta till papperskorg",
    ]);
  });

  it("opens Ny anteckning for the sort when a note is added to it", () => {
    const asked: string[] = [];
    const withDialog: TreeMenuActions = { ...actions, newNote: (sortId) => asked.push(sortId) };

    rowMenu(node("sort", "fordon"), false, withDialog)[0]?.onSelect();

    expect(asked).toEqual(["fordon"]);
  });

  it("offers a note the choice to link its name instead of a status", () => {
    const changes: boolean[] = [];
    const forNote: TreeMenuActions = {
      ...actions,
      linkOf: () => true,
      setLink: (_node, isLinked) => changes.push(isLinked),
    };

    const items = rowMenu(node("scene", "arvid"), false, forNote);
    items.find((item) => item.label === "Koppla namnet i texten")?.onSelect();

    expect(labels(items)).not.toContain("Status: Utkast");
    expect(items.find((item) => item.label === "Koppla namnet i texten")?.isChecked).toBe(true);
    expect(changes).toEqual([false]);
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
