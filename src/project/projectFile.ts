import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { rebuildTree, type NodeKind, type TreeNode } from "./tree.js";

export interface ProjectFile {
  /** Everything in project.json except the tree, kept as it was. */
  fields: Record<string, unknown>;
  tree: TreeNode[];
  /** File name of the copy kept when project.json could not be read, otherwise null. */
  repairCopy: string | null;
}

const KINDS: NodeKind[] = ["part", "chapter", "scene", "folder"];

const isOptionalString = (value: unknown) => value === undefined || typeof value === "string";
const isOptionalNodeList = (value: unknown): boolean =>
  value === undefined || (Array.isArray(value) && value.every(isTreeNode));

function isTreeNode(value: unknown): value is TreeNode {
  if (typeof value !== "object" || value === null) return false;
  const node = value as Record<string, unknown>;
  const hasIdAndKind = typeof node["id"] === "string" && KINDS.includes(node["kind"] as NodeKind);
  return hasIdAndKind && isOptionalString(node["title"]) && isOptionalNodeList(node["children"]);
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
    `${JSON.stringify({ ...fields, tree }, null, 2)}\n`,
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
  return { fields: {}, tree, repairCopy };
}

/** Reads project.json. A broken file is kept as a copy and the tree is rebuilt from the scenes. */
export async function readProjectFile(
  fileSystem: FileSystem,
  dir: string,
  sceneIds: string[],
): Promise<ProjectFile> {
  const text = await fileSystem.readText(projectPath(dir)).catch(() => null);
  if (text === null) return { fields: {}, tree: rebuildTree(sceneIds), repairCopy: null };
  const parsed = parseProject(text);
  if (!parsed) return repair(fileSystem, dir, text, sceneIds);
  return { ...parsed, repairCopy: null };
}
