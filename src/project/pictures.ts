import type { Node } from "prosemirror-model";
import type { OutlineItem } from "../export/book.js";
import { picturesInDocs } from "../manuscript/pictures.js";
import type { BookDesign } from "../export/bookDesign.js";
import { imageSize } from "../export/imageSize.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { t } from "../i18n/i18n.js";

/** The book's pictures live in this folder, so they sync and are backed up with the text. */
export const PICTURES_DIR = "bilder";

const EXTENSIONS = { jpeg: "jpg", png: "png" } as const;

/** Saved under a new name, so a picture in use is never replaced. Returns the file name. */
export async function savePicture(fileSystem: FileSystem, dir: string, bytes: Uint8Array) {
  const size = imageSize(bytes);
  if (!size) throw new Error(t("Bilden måste vara en JPG eller PNG."));
  const folder = joinPath(dir, PICTURES_DIR);
  await fileSystem.makeDir(folder);
  const name = `${Date.now().toString(36)}.${EXTENSIONS[size.type]}`;
  await writeAtomic(fileSystem, joinPath(folder, name), bytes);
  return name;
}

/** The pictures the design, the chapters and the text use. */
export function picturesUsed(
  design: BookDesign,
  outline: OutlineItem[],
  scenes: Iterable<Node> = [],
): string[] {
  const templates = design.openings.flatMap((template) =>
    template.areas.map((area) => area.picture),
  );
  const chapters = outline.flatMap((item) =>
    item.kind === "chapter" ? Object.values(item.pictures ?? {}) : [],
  );
  const inText = picturesInDocs(scenes);
  return [...new Set([design.breakPicture, ...templates, ...chapters, ...inText].filter(Boolean))];
}

/** A picture that cannot be read is left out, and the book is set without it. */
export async function readPictures(fileSystem: FileSystem, dir: string, names: string[]) {
  const found = new Map<string, Uint8Array>();
  for (const name of names) {
    const bytes = await fileSystem
      .readBytes(joinPath(joinPath(dir, PICTURES_DIR), name))
      .catch(() => null);
    if (bytes && imageSize(bytes)) found.set(name, bytes);
  }
  return found;
}
