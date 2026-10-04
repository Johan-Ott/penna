import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { ImportError, type ImportedNode } from "./markdownImport.js";
import { rtfToMarkdown } from "./rtf.js";

interface BinderItem {
  id: string;
  type: string;
  title: string;
  children: BinderItem[];
}

const TOKEN = /<BinderItem\b([^>]*)>|<\/BinderItem>|<Title>([^<]*)<\/Title>/g;
const ENTITIES = new Map([
  ["amp", "&"],
  ["lt", "<"],
  ["gt", ">"],
  ["quot", '"'],
  ["apos", "'"],
]);

const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (_all, name: string) => ENTITIES.get(name) ?? "");

// Scrivener 3 names an item by UUID, Scrivener 2 by ID.
const attribute = (attributes: string, name: string) =>
  new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";

function openItem(stack: BinderItem[], roots: BinderItem[], attributes: string) {
  const id = attribute(attributes, "UUID") || attribute(attributes, "ID");
  const item: BinderItem = { id, type: attribute(attributes, "Type"), title: "", children: [] };
  (stack[stack.length - 1]?.children ?? roots).push(item);
  stack.push(item);
}

// The first title inside an item is its own; later ones belong to its children.
function nameItem(item: BinderItem | undefined, title: string) {
  if (item && !item.title) item.title = decode(title).trim();
}

/** The binder of a .scrivx file as a tree of items. */
function readBinder(xml: string): BinderItem[] {
  const binder = /<Binder>([\s\S]*)<\/Binder>/.exec(xml)?.[1] ?? "";
  const roots: BinderItem[] = [];
  const stack: BinderItem[] = [];
  for (const [token, attributes, title = ""] of binder.matchAll(TOKEN)) {
    if (attributes !== undefined) openItem(stack, roots, attributes);
    else if (token === "</BinderItem>") stack.pop();
    else nameItem(stack[stack.length - 1], title);
  }
  return roots;
}

const allItems = (items: BinderItem[]): BinderItem[] =>
  items.flatMap((item) => [item, ...allItems(item.children)]);

async function readOrEmpty(fileSystem: FileSystem, path: string) {
  try {
    return await fileSystem.readText(path);
  } catch {
    return "";
  }
}

// Each item's text as Markdown; Scrivener 3 keeps it in Data/<UUID>, Scrivener 2 in Docs/<ID>.
async function readTexts(fileSystem: FileSystem, dir: string, items: BinderItem[]) {
  const texts = new Map<string, string>();
  for (const item of items) {
    const rtf =
      (await readOrEmpty(fileSystem, joinPath(dir, `Files/Data/${item.id}/content.rtf`))) ||
      (await readOrEmpty(fileSystem, joinPath(dir, `Files/Docs/${item.id}.rtf`)));
    texts.set(item.id, rtf ? rtfToMarkdown(rtf) : "");
  }
  return texts;
}

const isFolder = (item: BinderItem) => item.type === "Folder";

/** Turns the binder's draft into parts, chapters and scenes. */
function draftBook(draft: BinderItem[], texts: Map<string, string>): ImportedNode[] {
  // A text is a scene; a folder deeper than a chapter adds its texts to that chapter.
  const scenes = (item: BinderItem): ImportedNode[] => {
    const body = texts.get(item.id) ?? "";
    const own: ImportedNode[] =
      isFolder(item) && !body ? [] : [{ kind: "scene", title: item.title, body }];
    return [...own, ...item.children.flatMap(scenes)];
  };
  const chapter = (item: BinderItem): ImportedNode => ({
    kind: "chapter",
    title: item.title,
    children: [...scenes({ ...item, children: [] }), ...item.children.flatMap(scenes)],
  });
  const branch = (item: BinderItem, canBePart: boolean): ImportedNode[] => {
    if (!isFolder(item)) return scenes(item);
    if (!canBePart || !item.children.some(isFolder)) return [chapter(item)];
    const children = item.children.flatMap((child) => branch(child, false));
    return [{ kind: "part", title: item.title, children }];
  };
  return draft.flatMap((item) => branch(item, true));
}

/** A Scrivener project folder (.scriv): the texts in its draft, in binder order. */
export async function readScrivener(fileSystem: FileSystem, dir: string) {
  const scrivx = (await fileSystem.list(dir)).find((name) => name.endsWith(".scrivx"));
  if (!scrivx) throw new ImportError("Mappen är inget Scrivener-projekt.");
  const binder = readBinder(await fileSystem.readText(joinPath(dir, scrivx)));
  const draft = binder.find((item) => item.type === "DraftFolder")?.children ?? [];
  return draftBook(draft, await readTexts(fileSystem, dir, allItems(draft)));
}
