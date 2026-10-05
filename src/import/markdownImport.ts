import { t } from "../i18n/i18n.js";
export type ImportedNode =
  | { kind: "part" | "chapter"; title: string; children: ImportedNode[] }
  | { kind: "scene"; title: string; body: string };

export class ImportError extends Error {}

interface Heading {
  level: number;
  title: string;
}

const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const SCENE_BREAK = /^\s*(\*\s*\*\s*\*[\s*]*|-{3,}|_{3,}|#)\s*$/;
// In plain text a short line such as "Kapitel 3" or "KAPITEL 3: Fyren" starts a chapter.
const CHAPTER_LINE = /^(kapitel\s+[\p{L}\p{N}]+)\s*(?:[:.–-]\s*(.+))?$/iu;
const TITLE_WORDS = 6;

function headingOf(line: string, hasMarkdownHeadings: boolean): Heading | null {
  const atx = ATX_HEADING.exec(line);
  if (atx?.[1] && atx[2]) return { level: atx[1].length, title: atx[2] };
  if (hasMarkdownHeadings) return null;
  const chapter = CHAPTER_LINE.exec(line.trim());
  return chapter?.[1] ? { level: 1, title: chapter[2] ?? chapter[1] } : null;
}

export function titleFromText(body: string): string {
  const words = body
    .replace(/[*_`>#[\]()]/g, "")
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}’'-]/gu, ""))
    .filter(Boolean);
  return words.slice(0, TITLE_WORDS).join(" ") || t("Namnlös scen");
}

function scenesOf(lines: string[], sceneTitle: string | null): ImportedNode[] {
  const pieces: string[][] = [[]];
  for (const line of lines) {
    if (SCENE_BREAK.test(line)) pieces.push([]);
    else pieces[pieces.length - 1]?.push(line);
  }
  return pieces
    .map((piece) => piece.join("\n").trim())
    .filter((body) => body !== "")
    .map((body, index) => ({
      kind: "scene",
      title: index === 0 && sceneTitle ? sceneTitle : titleFromText(body),
      body: `${body}\n`,
    }));
}

interface Section {
  heading: Heading | null;
  lines: string[];
}

function sectionsOf(text: string): Section[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const hasMarkdownHeadings = lines.some((line) => ATX_HEADING.test(line));
  const sections: Section[] = [{ heading: null, lines: [] }];
  for (const line of lines) {
    const heading = headingOf(line, hasMarkdownHeadings);
    if (heading) sections.push({ heading, lines: [] });
    else sections[sections.length - 1]?.lines.push(line);
  }
  return sections;
}

// With two or more heading levels, the top one is parts and the next chapters.
function rolesOf(sections: Section[]) {
  const levels = [
    ...new Set(sections.flatMap((section) => (section.heading ? [section.heading.level] : []))),
  ].sort();
  const [first, second, third] = levels;
  return levels.length >= 2
    ? { part: first, chapter: second, scene: third }
    : { part: undefined, chapter: first, scene: undefined };
}

type Branch = Extract<ImportedNode, { kind: "part" | "chapter" }>;

interface Outline {
  book: ImportedNode[];
  part: Branch | null;
  chapter: Branch | null;
}

function openBranch(outline: Outline, kind: Branch["kind"], title: string) {
  const branch: Branch = { kind, title, children: [] };
  if (kind === "part") {
    outline.book.push(branch);
    outline.part = branch;
    outline.chapter = null;
  } else {
    (outline.part?.children ?? outline.book).push(branch);
    outline.chapter = branch;
  }
}

type Roles = ReturnType<typeof rolesOf>;

function branchKind(heading: Heading | null, roles: Roles): Branch["kind"] | null {
  if (!heading) return null;
  if (heading.level === roles.part) return "part";
  return heading.level === roles.chapter ? "chapter" : null;
}

function addSection(outline: Outline, roles: Roles, { heading, lines }: Section) {
  const kind = branchKind(heading, roles);
  if (heading && kind) openBranch(outline, kind, heading.title);
  // Any deeper heading names the scene that follows it.
  const sceneTitle = heading && !kind ? heading.title : null;
  const into = (outline.chapter ?? outline.part)?.children ?? outline.book;
  into.push(...scenesOf(lines, sceneTitle));
}

export function splitManuscript(text: string): ImportedNode[] {
  const sections = sectionsOf(text);
  const roles = rolesOf(sections);
  const outline: Outline = { book: [], part: null, chapter: null };
  for (const section of sections) addSection(outline, roles, section);
  return outline.book;
}
