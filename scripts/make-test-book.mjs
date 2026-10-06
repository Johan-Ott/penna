// A long book for testing speed and the page map: node scripts/make-test-book.mjs <folder> [words]
// Writes "Testbok.penna" inside <folder>; open it in Penna with Öppna mapp.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [folder, wordsArgument = "100000"] = process.argv.slice(2);
if (!folder) {
  process.stderr.write("Ange en mapp: node scripts/make-test-book.mjs <mapp> [antal ord]\n");
  process.exit(1);
}

const SENTENCES = [
  "Isen låg tjock över viken och ingen visste när den skulle släppa.",
  "Elin gick längs stranden där vassen stack upp genom snön.",
  "– Vet du vem det är från? frågade Arvid utan att vända sig om.",
  "Fyren blinkade bortom udden, som den gjort varje natt i fyrtio år.",
  "Maja kom över med en termos och satte sig utan att fråga.",
  "Det lät som att någon andades under isen.",
];
const SCENE_WORDS = 1000;
const SCENES_PER_CHAPTER = 3;

const id = (number) => `01TEST${String(number).padStart(20, "0")}`;

function sceneText(number) {
  const paragraphs = [];
  let words = 0;
  for (let index = number; words < SCENE_WORDS; index += 1) {
    const paragraph = Array.from(
      { length: 5 },
      (_unused, step) => SENTENCES[(index + step) % SENTENCES.length],
    ).join(" ");
    paragraphs.push(paragraph);
    words += paragraph.split(/\s+/).length;
  }
  return paragraphs.join("\n\n");
}

const dir = join(folder, "Testbok.penna");
mkdirSync(join(dir, "scenes"), { recursive: true });
const scenes = Math.ceil(Number(wordsArgument) / SCENE_WORDS);
const chapters = [];
for (let number = 0; number < scenes; number += 1) {
  if (number % SCENES_PER_CHAPTER === 0) {
    chapters.push({
      id: id(100000 + chapters.length),
      kind: "chapter",
      title: `Kapitel ${chapters.length + 1}`,
      children: [],
    });
  }
  const sceneId = id(number);
  chapters.at(-1).children.push({ id: sceneId, kind: "scene" });
  const file = `---\nid: ${sceneId}\ntitle: Scen ${number + 1}\nstatus: utkast\n---\n${sceneText(number)}\n`;
  writeFileSync(join(dir, "scenes", `${sceneId}.md`), file);
}
const project = { title: "Testbok", type: "roman", dailyGoal: 1000, tree: chapters };
writeFileSync(join(dir, "project.json"), `${JSON.stringify(project, null, 2)}\n`);
process.stdout.write(
  `${dir}: ${chapters.length} kapitel, ${scenes} scener, cirka ${scenes * SCENE_WORDS} ord\n`,
);
