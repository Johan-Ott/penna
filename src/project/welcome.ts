import { newSceneText, withField } from "../manuscript/sceneFile.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { scenePath, type FileSystem } from "../storage/fileSystem.js";
import { newSceneId } from "../storage/sceneId.js";
import { t } from "../i18n/i18n.js";

// Every new book starts with a welcome: a note under Övrigt, never part of the book, that says
// where to begin and goes when the writer removes it. project.json keeps its id as `welcome`.

const text = () =>
  [
    t(
      "Det här är en anteckning, inte en del av boken. Den syns inte när du läser eller exporterar.",
    ),
    t(
      "**Börja skriva.** Lägg till ett kapitel och en scen med + Lägg till i trädet, på telefonen under Boken.",
    ),
    t(
      "**Anteckningar.** Personer, platser och saker lägger du till med + Ny anteckning. Deras namn blir länkar i texten.",
    ),
    t(
      "**Hjälp på vägen.** Exempelboken på bokhyllan visar allt Penna kan, med exempel. Hjälp finns under Inställningar.",
    ),
    t("När du inte behöver den här längre tar du bort den längst ner."),
  ].join("\n\n");

/** Writes the welcome note and gives its id. */
export async function writeWelcome(fileSystem: FileSystem, dir: string) {
  const id = newSceneId();
  const head = withField(newSceneText(id, t("Välkommen")), "link", "false");
  await writeAtomic(fileSystem, scenePath(dir, id), `${head}\n${text()}\n`);
  return id;
}
