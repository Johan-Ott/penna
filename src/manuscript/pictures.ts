import type { Image } from "mdast";
import type { Node } from "prosemirror-model";
import { PICTURE_SIZES, type PictureSize } from "./schema.js";

const FOLDER = "bilder/";

export interface PictureAttrs {
  name: string;
  caption: string;
  size: PictureSize;
}

/** A paragraph that is a single image from bilder/ is a picture; any other image stays text. */
export function pictureOf(image: Image): PictureAttrs | null {
  if (!image.url.startsWith(FOLDER)) return null;
  const name = decodeURIComponent(image.url.slice(FOLDER.length));
  if (!/^[\w.-]+\.(png|jpe?g)$/i.test(name)) return null;
  const size = (PICTURE_SIZES as readonly string[]).includes(image.title ?? "")
    ? (image.title as PictureSize)
    : "bred";
  return { name, caption: image.alt ?? "", size };
}

// Square brackets in a caption would end the image's text, so they are left out.
const safeCaption = (caption: string) => caption.replace(/[[\]\n]/g, " ").trim();

/** ![caption](bilder/name.png), with the size as its title unless it is the usual one. */
export function pictureMarkdown(picture: Node): string {
  const { name, caption, size } = picture.attrs as PictureAttrs;
  const title = size === "bred" ? "" : ` "${size}"`;
  return `![${safeCaption(caption)}](${FOLDER}${encodeURI(name)}${title})`;
}

/** The names of every picture in these texts. */
export function picturesInDocs(docs: Iterable<Node>): string[] {
  const names: string[] = [];
  for (const doc of docs) {
    doc.descendants((node) => {
      if (node.type.name === "picture") names.push(String(node.attrs["name"]));
    });
  }
  return names;
}
