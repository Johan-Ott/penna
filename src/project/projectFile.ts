import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, readIfThere, type FileSystem } from "../storage/fileSystem.js";
import { HEADING_FIELDS, rebuildTree, type NodeKind, type TreeNode } from "./tree.js";

export interface ProjectFile {
  fields: Record<string, unknown>;
  tree: TreeNode[];
  /** Null when project.json could be read. */
  repairCopy: string | null;
  /** Opened read-only, so this version never writes over it. */
  isNewerFormat: boolean;
}

// The project.json format this Penna writes. A newer format needs a migration step per version.
const FORMAT_VERSION = 1;

const KINDS: NodeKind[] = ["part", "chapter", "scene", "folder", "sort"];

const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";
const isOptionalNodeList = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isTreeNode));

const isTextRecord = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  Object.values(value).every((text) => typeof text === "string");

function isTreeNode(value: unknown): value is TreeNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  const hasIdAndKind = typeof node["id"] === "string" && KINDS.includes(node["kind"] as NodeKind);
  const texts = ["title", "summary", "when", "opening", ...HEADING_FIELDS].every((key) =>
    isOptionalString(node[key]),
  );
  const pictures = node["pictures"] === undefined || isTextRecord(node["pictures"]);
  return hasIdAndKind && texts && pictures && isOptionalNodeList(node["children"]);
}

function parseProject(text: string): { fields: Record<string, unknown>; tree: TreeNode[] } | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== "object" || parsed === null) return null;
    const { tree, ...fields } = parsed as Record<string, unknown>;
    return Array.isArray(tree) && tree.every(isTreeNode) ? { fields, tree } : null;
  } catch {
    return null;
  }
}

const projectPath = (dir: string) => joinPath(dir, "project.json");

export async function writeProjectFile(
  fileSystem: FileSystem,
  dir: string,
  fields: Record<string, unknown>,
  tree: TreeNode[],
) {
  await writeAtomic(
    fileSystem,
    projectPath(dir),
    `${JSON.stringify({ ...fields, formatVersion: FORMAT_VERSION, tree }, null, 2)}\n`,
  );
}

async function repair(
  fileSystem: FileSystem,
  dir: string,
  brokenText: string,
  sceneIds: string[],
): Promise<ProjectFile> {
  const stamp = new Date().toISOString().slice(0, 16).replace(":", "-");
  const repairCopy = `project.json.trasig-${stamp}`;
  await writeAtomic(fileSystem, joinPath(dir, repairCopy), brokenText);
  const tree = rebuildTree(sceneIds);
  await writeProjectFile(fileSystem, dir, {}, tree);
  return { fields: {}, tree, repairCopy, isNewerFormat: false };
}

/** A broken file is kept as a copy and the tree is rebuilt from the scenes. */
export async function readProjectFile(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
): Promise<ProjectFile> {
  const text = await readIfThere(fileSystem, projectPath(dir));
  if (text === null) {
    return { fields: {}, tree: rebuildTree(sceneIds), repairCopy: null, isNewerFormat: false };
  }
  const parsed = parseProject(text);
  if (!parsed) return repair(fileSystem, dir, text, sceneIds);
  const { formatVersion, ...fields } = parsed.fields;
  const isNewerFormat = typeof formatVersion === "number" && formatVersion > FORMAT_VERSION;
  return { fields, tree: parsed.tree, repairCopy: null, isNewerFormat };
}
