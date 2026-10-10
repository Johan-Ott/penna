// One person's voice: the lines in the book that are theirs by their speech tag, such as
// "– Det kom i morse, sa Arvid." or "Arvid frågade: ...". Lines with no name are left out.

const SPOKEN = /^\s*[\u2013\u2014\-”"“]/;
const SPEECH_VERBS =
  "sa|sade|frågade|svarade|viskade|ropade|mumlade|skrek|väste|said|asked|replied|whispered|shouted|muttered";

const escaped = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Spoken lines tagged with the name, in the order of the given scenes. */
export function linesOf(name: string, scenes: { sceneId: string; text: string }[]) {
  const first = escaped(name.split(/\s+/)[0] ?? "");
  if (!first) return [];
  const tagged = new RegExp(
    `(?<!\\p{L})(?:(?:${SPEECH_VERBS})\\s+${first}|${first}\\s+(?:${SPEECH_VERBS}))(?!\\p{L})`,
    "u",
  );
  return scenes.flatMap(({ sceneId, text }) =>
    text
      .split("\n")
      .filter((line) => SPOKEN.test(line) && tagged.test(line))
      .map((line) => ({ sceneId, line: line.trim() })),
  );
}
