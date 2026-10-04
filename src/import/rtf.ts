import type { Mark } from "prosemirror-model";
import {
  addLineBreak,
  addText,
  blocksToMarkdown,
  endBlock,
  newBlockReader,
  setMark,
  type BlockReader,
} from "./paragraphs.js";

interface Group {
  isSkipped: boolean;
  marks: readonly Mark[];
  /** How many fallback characters follow a \uN, as set by \ucN. */
  fallback: number;
}

interface Rtf {
  reader: BlockReader;
  group: Group;
  outer: Group[];
  /** Fallback characters still to drop after a \uN. */
  toDrop: number;
}

// A control word, a hex byte, a control symbol, a brace, or a run of text.
const TOKEN = /\\([a-z]+)(-?\d+)? ?|\\'([0-9a-f]{2})|\\([^a-z])|([{}])|([^\\{}\r\n]+)/gi;
// Groups whose text is not part of the prose: tables, metadata, pictures, Scrivener's notes.
const SKIPPED =
  /^(fonttbl|colortbl|expandedcolortbl|stylesheet|info|pict|header|footer|footnote|listtable|listoverridetable|generator)$/;
const WORDS = new Map([
  ["tab", "\t"],
  ["ldblquote", "“"],
  ["rdblquote", "”"],
  ["lquote", "‘"],
  ["rquote", "’"],
  ["endash", "–"],
  ["emdash", "—"],
  ["bullet", "•"],
]);
const SYMBOLS = new Map([
  ["~", " "],
  ["_", "‑"],
  ["-", ""],
]);
const WINDOWS_1252 = new TextDecoder("windows-1252");

function text(rtf: Rtf, value: string) {
  const dropped = Math.min(rtf.toDrop, value.length);
  rtf.toDrop -= dropped;
  if (!rtf.group.isSkipped) addText(rtf.reader, value.slice(dropped));
}

function brace(rtf: Rtf, value: string) {
  if (value === "{") {
    rtf.outer.push(rtf.group);
    rtf.group = { ...rtf.group, marks: rtf.reader.marks };
    return;
  }
  rtf.reader.marks = rtf.group.marks;
  rtf.group = rtf.outer.pop() ?? rtf.group;
  rtf.reader.marks = rtf.group.marks;
}

function unicode(rtf: Rtf, code: number) {
  text(rtf, String.fromCharCode(code < 0 ? code + 65536 : code));
  rtf.toDrop = rtf.group.fallback;
}

function styleWord(rtf: Rtf, word: string, isOn: boolean) {
  if (rtf.group.isSkipped) return;
  if (word === "par") endBlock(rtf.reader);
  else if (word === "line") addLineBreak(rtf.reader);
  else if (word === "i" || word === "b")
    setMark(rtf.reader, word === "i" ? "italic" : "bold", isOn);
  else if (word === "plain") rtf.reader.marks = [];
}

function controlWord(rtf: Rtf, word: string, parameter: string | undefined) {
  const number = Number(parameter ?? 1);
  const replacement = WORDS.get(word);
  if (SKIPPED.test(word)) rtf.group.isSkipped = true;
  else if (word === "u") unicode(rtf, number);
  else if (word === "uc") rtf.group.fallback = number;
  else if (replacement) text(rtf, replacement);
  else styleWord(rtf, word, number !== 0);
}

function controlSymbol(rtf: Rtf, symbol: string) {
  if (symbol === "*") rtf.group.isSkipped = true;
  else if (symbol === "\n" || symbol === "\r") styleWord(rtf, "par", true);
  else text(rtf, SYMBOLS.get(symbol) ?? symbol);
}

/** The prose of an RTF file, such as a Scrivener text, as Penna's Markdown. */
export function rtfToMarkdown(source: string): string {
  const rtf: Rtf = {
    reader: newBlockReader(),
    group: { isSkipped: false, marks: [], fallback: 1 },
    outer: [],
    toDrop: 0,
  };
  for (const [, word, parameter, hex, symbol, braceToken, run] of source.matchAll(TOKEN)) {
    if (word) controlWord(rtf, word, parameter);
    else if (hex) text(rtf, WINDOWS_1252.decode(new Uint8Array([parseInt(hex, 16)])));
    else if (symbol) controlSymbol(rtf, symbol);
    else if (braceToken) brace(rtf, braceToken);
    else if (run) text(rtf, run);
  }
  return blocksToMarkdown(rtf.reader);
}
