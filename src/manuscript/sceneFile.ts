export interface SceneFileParts {
  /** Raw text including both `---` lines, or "" when the file has none. */
  frontMatter: string;
  body: string;
}

const FRONT_MATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;

export function splitSceneFile(text: string): SceneFileParts {
  const frontMatter = FRONT_MATTER.exec(text)?.[0] ?? "";
  return { frontMatter, body: text.slice(frontMatter.length) };
}

export function joinSceneFile(parts: SceneFileParts): string {
  return parts.frontMatter + parts.body;
}

const fieldLine = (key: string) => new RegExp(`^${key}:[ \\t]*(.*?)[ \\t]*$`, "m");
// A plain YAML value may not contain ": " or start with a quote, so such titles are quoted.
const NEEDS_QUOTES = /: |^["'#&*!|>%@`]/;

/** Unquoted; null when missing or empty. */
export function readField(frontMatter: string, key: string): string | null {
  const value = fieldLine(key).exec(frontMatter)?.[1];
  if (value === undefined || value === "") return null;
  if (!value.startsWith('"')) return value;
  try {
    return JSON.parse(value) as string;
  } catch {
    return value;
  }
}

export const sceneTitle = (frontMatter: string) => readField(frontMatter, "title");

/** Anything but `link: true` or `link: false` follows the note's sort. */
export function noteLink(frontMatter: string): boolean | null {
  const value = readField(frontMatter, "link");
  if (value === "true" || value === "false") return value === "true";
  return null;
}

export const yamlValue = (text: string) => (NEEDS_QUOTES.test(text) ? JSON.stringify(text) : text);

export function newSceneText(id: string, title: string): string {
  return `---\nid: ${id}\ntitle: ${yamlValue(title)}\nstatus: idé\n---\n`;
}

export function withField(frontMatter: string, key: string, value: string): string {
  const line = `${key}: ${value}`;
  const pattern = new RegExp(`^${key}:.*$`, "m");
  if (frontMatter === "") return `---\n${line}\n---\n`;
  if (pattern.test(frontMatter)) return frontMatter.replace(pattern, () => line);
  return frontMatter.replace(
    /(\r?\n)---(\r?\n)?$/,
    (closing, lineEnd: string) => `${lineEnd}${line}${closing}`,
  );
}

export const withTextField = (frontMatter: string, key: string, value: string) =>
  withField(frontMatter, key, yamlValue(value));

export const withSceneTitle = (frontMatter: string, title: string) =>
  withTextField(frontMatter, "title", title);

export const SCENE_STATUSES = ["idé", "utkast", "redigering", "klar"] as const;
export type SceneStatus = (typeof SCENE_STATUSES)[number];

const STATUS_LINE = /^status:[ \t]*(\S+)/m;

export function sceneStatus(frontMatter: string): SceneStatus {
  const value = STATUS_LINE.exec(frontMatter)?.[1] ?? "";
  return (SCENE_STATUSES as readonly string[]).includes(value) ? (value as SceneStatus) : "idé";
}

export const withSceneStatus = (frontMatter: string, status: SceneStatus) =>
  withField(frontMatter, "status", status);
