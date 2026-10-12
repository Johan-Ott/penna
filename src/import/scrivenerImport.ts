import { CHARACTERS_ID, PLACES_ID } from "../project/sorts.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { ImportError, type ImportedNode } from "./markdownImport.js";
import { rtfToMarkdown } from "./rtf.js";
import { t } from "../i18n/i18n.js";

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

interface ItemTexts {
  bodies: Map<string, string>;
  /** The index card's synopsis, which becomes Vad händer?. */
  synopses: Map<string, string>;
}

// Scrivener 3 keeps a text in Data/<UUID>, Scrivener 2 in Docs/<ID>.
async function readTexts(fileSystem: FileSystem, dir: string, items: BinderItem[]) {
  const texts: ItemTexts = { bodies: new Map(), synopses: new Map() };
  for (const item of items) {
    const read = (newer: string, older: string) =>
      readOrEmpty(fileSystem, joinPath(dir, `Files/Data/${item.id}/${newer}`)).then(
        (text) => text || readOrEmpty(fileSystem, joinPath(dir, `Files/Docs/${item.id}${older}`)),
      );
    const rtf = await read("content.rtf", ".rtf");
    texts.bodies.set(item.id, rtf ? rtfToMarkdown(rtf) : "");
    texts.synopses.set(item.id, (await read("synopsis.txt", "_synopsis.txt")).trim());
  }
  return texts;
}

const withSynopsis = (texts: ItemTexts, id: string) => {
  const synopsis = texts.synopses.get(id);
  return synopsis ? { summary: synopsis } : {};
};

const isFolder = (item: BinderItem) => item.type === "Folder";

function draftBook(draft: BinderItem[], texts: ItemTexts): ImportedNode[] {
  // A folder deeper than a chapter adds its texts to that chapter.
  const scenes = (item: BinderItem): ImportedNode[] => {
    const body = texts.bodies.get(item.id) ?? "";
    const scene = {
      kind: "scene" as const,
      title: item.title,
      body,
      ...withSynopsis(texts, item.id),
    };
    const own: ImportedNode[] = isFolder(item) && !body ? [] : [scene];
    return [...own, ...item.children.flatMap(scenes)];
  };
  const chapter = (item: BinderItem): ImportedNode => ({
    kind: "chapter",
    title: item.title,
    ...withSynopsis(texts, item.id),
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

// Characters and places land in Penna's own sorts; any other folder beside the draft is a sort
// of its own, such as Research. Pictures and PDFs there have no text and are left out.
const OWN_SORTS: [RegExp, string][] = [
  [/character|karakt|person|figur/i, CHARACTERS_ID],
  [/place|setting|location|plats|milj/i, PLACES_ID],
];
const LEFT_OUT = new Set(["DraftFolder", "TrashFolder"]);

function noteSorts(binder: BinderItem[], texts: ItemTexts): ImportedNode[] {
  const notes = (item: BinderItem): ImportedNode[] => {
    const body = texts.bodies.get(item.id) ?? "";
    const own: ImportedNode[] = body ? [{ kind: "scene", title: item.title, body }] : [];
    return [...own, ...item.children.flatMap(notes)];
  };
  return binder
    .filter((item) => !LEFT_OUT.has(item.type) && item.children.length > 0)
    .filter((item) => !/template|mall/i.test(item.title))
    .map((item) => {
      const id = OWN_SORTS.find(([name]) => name.test(item.title))?.[1];
      return {
        kind: "sort",
        title: item.title,
        ...(id ? { id } : {}),
        children: item.children.flatMap(notes),
      };
    });
}

export async function readScrivener(fileSystem: FileSystem, dir: string) {
  const scrivx = (await fileSystem.list(dir)).find((name) => name.endsWith(".scrivx"));
  if (!scrivx) throw new ImportError(t("Mappen är inget Scrivener-projekt."));
  const binder = readBinder(await fileSystem.readText(joinPath(dir, scrivx)));
  const draft = binder.find((item) => item.type === "DraftFolder")?.children ?? [];
  const texts = await readTexts(fileSystem, dir, allItems(binder));
  const sorts = noteSorts(binder, texts).filter(
    (sort) => sort.kind === "sort" && sort.children.length > 0,
  );
  return [...draftBook(draft, texts), ...sorts];
}
