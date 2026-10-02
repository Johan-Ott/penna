import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

const EM_DASH = String.fromCharCode(0x2014);
const MAX_COMMENT_LINES = 2;
const MAX_COMMENT_LENGTH = 100;
const CODE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs"]);
const TEXT_EXTENSIONS = new Set([...CODE_EXTENSIONS, ".md", ".json", ".yml"]);
const ROOTS = ["src", "tests", "scripts", ".claude", "CLAUDE.md"];

const SLOP_WORDS = [
  "robust",
  "seamless",
  "leverage",
  "elegant",
  "delve",
  "comprehensive",
  "utilize",
  "powerful",
  "magic",
  "orchestrate",
  "symphony",
  "tapestry",
  "under the hood",
  "heavy lifting",
  "gracefully",
  "crucial",
];
const HISTORY_PHRASES = ["previously", "changed from", "used to", "no longer", "refactored"];

const LINE_COMMENT = /(?:^|\s)\/\/\s?(.*)$/;
const COMMENTED_OUT_CODE =
  /^(const|let|var|if|for|while|return|import|export|function|class)\b.*[;{})]$/;

function stripBlockMarkers(line) {
  return line.replace(/^\/?\*+\/?\s?/, "").replace(/\s?\*\/$/, "");
}

function extractComments(lines) {
  const comments = [];
  let insideBlock = false;
  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const trimmed = rawLine.trim();
    if (insideBlock || trimmed.startsWith("/*")) {
      comments.push({ lineNumber, text: stripBlockMarkers(trimmed) });
      insideBlock = !trimmed.includes("*/");
      return;
    }
    const match = LINE_COMMENT.exec(rawLine);
    if (match) comments.push({ lineNumber, text: match[1] ?? "" });
  });
  return comments.filter((comment) => comment.text.trim() !== "");
}

function checkComment({ lineNumber, text }, file) {
  const where = `${file}:${lineNumber}`;
  const lower = text.toLowerCase();
  const problems = [];
  const slop = SLOP_WORDS.find((word) => lower.includes(word));
  if (slop) problems.push(`${where}: comment uses "${slop}", write it plainly`);
  const history = HISTORY_PHRASES.find((phrase) => lower.includes(phrase));
  if (history)
    problems.push(`${where}: comment tells history ("${history}"), use the commit message`);
  if (text.length > MAX_COMMENT_LENGTH)
    problems.push(`${where}: comment longer than ${MAX_COMMENT_LENGTH} characters`);
  if (COMMENTED_OUT_CODE.test(text.trim()))
    problems.push(`${where}: commented-out code, delete it`);
  return problems;
}

function findLongCommentRuns(comments, file) {
  const problems = [];
  let runStart = 0;
  let runLength = 0;
  let previousLine = -1;
  for (const { lineNumber } of comments) {
    const continuesRun = lineNumber === previousLine + 1;
    runLength = continuesRun ? runLength + 1 : 1;
    if (!continuesRun) runStart = lineNumber;
    if (runLength === MAX_COMMENT_LINES + 1) {
      problems.push(
        `${file}:${runStart}: comment block over ${MAX_COMMENT_LINES} lines, make the code explain itself`,
      );
    }
    previousLine = lineNumber;
  }
  return problems;
}

function findEmDashes(lines, file) {
  return lines
    .map((line, index) =>
      line.includes(EM_DASH) ? `${file}:${index + 1}: em dash, use a period, comma or colon` : null,
    )
    .filter(Boolean);
}

export function findProblems(file, text) {
  const lines = text.split("\n");
  const problems = findEmDashes(lines, file);
  if (!CODE_EXTENSIONS.has(extname(file))) return problems;
  const comments = extractComments(lines);
  return [
    ...problems,
    ...comments.flatMap((comment) => checkComment(comment, file)),
    ...findLongCommentRuns(comments, file),
  ];
}

function listFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((name) => listFiles(join(path, name)));
}

function main() {
  const files = ROOTS.flatMap(listFiles).filter((file) => TEXT_EXTENSIONS.has(extname(file)));
  const problems = files.flatMap((file) => findProblems(file, readFileSync(file, "utf8")));
  if (problems.length === 0) return 0;
  process.stderr.write(`${problems.join("\n")}\n`);
  return 1;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  process.exit(main());
}
