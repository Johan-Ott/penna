import { InputRule } from "prosemirror-inputrules";
import { Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import type { SpellingSwitch } from "./spellingMarks.js";

// Safe corrections only, each taken back at once by Backspace or Ctrl+Z: a capital letter where
// a sentence starts, HEj as Hej, and a misspelling with one obvious correction.

// Abbreviations a sentence goes on after, such as "kl. 5" or "t.ex. en".
const GOES_ON = /(?:^|\s)(?:\p{L}+\.\p{L}+\.?|kl|ca|resp|jfr|nr|st|vs|e\.g|i\.e)\.$/iu;

const capitalise = (match: RegExpMatchArray) => {
  const letter = match[2] ?? "";
  return (match[1] ?? "") + letter.toLocaleUpperCase();
};

/** The rules, asking `isOn` each time so they switch without a new editor state. */
export function autocorrectRules(isOn: () => boolean): InputRule[] {
  const sentenceStart = new InputRule(
    /(^|^[–”]\s?|[.!?][”"]?\s+)(\p{Ll})$/u,
    (state, match, start, end) => {
      // The text up to and with the full stop, to see whether it ends an abbreviation.
      const head = (match.input ?? "").slice(0, (match.index ?? 0) + 1);
      if (!isOn() || GOES_ON.test(head)) return null;
      return state.tr.insertText(capitalise(match), start, end);
    },
  );
  const twoCapitals = new InputRule(
    /(?<!\p{L})(\p{Lu})(\p{Lu})(\p{Ll}{2,})([\s.,!?;:])$/u,
    (state, match, start, end) => {
      if (!isOn()) return null;
      const [, first = "", second = "", rest = "", after = ""] = match;
      return state.tr.insertText(first + second.toLocaleLowerCase() + rest + after, start, end);
    },
  );
  return [sentenceStart, twoCapitals];
}

const isSwapAt = (word: string, other: string, place: number) =>
  word[place] === other[place + 1] &&
  word[place + 1] === other[place] &&
  word.slice(place + 2) === other.slice(place + 2);

// Swapped, missing, extra or changed: one step from the word.
export function isOneStep(word: string, other: string) {
  if (word === other || Math.abs(word.length - other.length) > 1) return false;
  let place = 0;
  while (word[place] === other[place]) place++;
  const tail = (skipWord: number, skipOther: number) =>
    word.slice(place + skipWord) === other.slice(place + skipOther);
  return isSwapAt(word, other, place) || tail(1, 1) || tail(1, 0) || tail(0, 1);
}

const LAST_WORD = /(?<!\p{L})(\p{Ll}{3,})[\s.,!?;:]$/u;
// HEj, DEt: short enough to be an abbreviation such as TVn, so only fixed when the dictionary
// knows the word it becomes.
const SHORT_CAPITALS = /(?<!\p{L})(\p{Lu}{2}\p{Ll})[\s.,!?;:]$/u;

const isWrong = async (spelling: SpellingSwitch, word: string) =>
  (await spelling.misspelled(spelling.language, [word]).catch((): string[] => [])).includes(word);

async function capitalsFixed(spelling: SpellingSwitch, word: string) {
  const fixed = word[0] + word.slice(1).toLocaleLowerCase();
  return (await isWrong(spelling, fixed)) ? null : { word, fixed };
}

// The dictionary's first guess, when it is one step from a lowercase word; capitalised words
// may be names and are left alone.
async function spellingFixed(spelling: SpellingSwitch, word: string) {
  if (spelling.isKnown(word) || !(await isWrong(spelling, word))) return null;
  const [best] = await spelling.suggestions(spelling.language, word).catch((): string[] => []);
  return best && isOneStep(word, best) ? { word, fixed: best } : null;
}

function correctionOf(spelling: SpellingSwitch, before: string) {
  const short = before.match(SHORT_CAPITALS)?.[1];
  if (short) return capitalsFixed(spelling, short);
  const word = before.match(LAST_WORD)?.[1];
  return word ? spellingFixed(spelling, word) : null;
}

interface Fix {
  from: number;
  word: string;
  fixed: string;
}

// The last correction, kept until anything else changes, so Backspace right after takes it back.
const lastFix = new PluginKey<Fix | null>("autocorrect");

// The word is changed only if it still stands where it was typed.
async function correctLastWord(view: EditorView, spelling: SpellingSwitch, end: number) {
  const before = view.state.doc.textBetween(Math.max(0, end - 40), end, "\n");
  const correction = await correctionOf(spelling, before);
  if (!correction) return;
  const from = end - 1 - correction.word.length;
  if (view.state.doc.textBetween(from, end - 1) !== correction.word) return;
  const transaction = view.state.tr.insertText(correction.fixed, from, end - 1);
  view.dispatch(transaction.setMeta(lastFix, { from, ...correction }));
}

const undoFix = (view: EditorView): boolean => {
  const fix = lastFix.getState(view.state);
  const { from, empty } = view.state.selection;
  if (!fix || !empty || from !== fix.from + fix.fixed.length + 1) return false;
  view.dispatch(view.state.tr.insertText(fix.word, fix.from, fix.from + fix.fixed.length));
  return true;
};

/** Corrects an obvious misspelling once the word is finished, where Penna checks the spelling. */
export function autocorrectPlugin(isOn: () => boolean, spelling: () => SpellingSwitch | null) {
  return new Plugin<Fix | null>({
    key: lastFix,
    state: {
      init: () => null,
      apply: (transaction, fix) =>
        transaction.getMeta(lastFix) ?? (transaction.docChanged ? null : fix),
    },
    props: {
      handleTextInput(view, from, _to, text) {
        const current = spelling();
        if (isOn() && current && /^[\s.,!?;:]$/.test(text)) {
          queueMicrotask(() => void correctLastWord(view, current, from + text.length));
        }
        return false;
      },
      handleKeyDown: (view, event) => event.key === "Backspace" && undoFix(view),
    },
  });
}
