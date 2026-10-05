import { imageSize, type ImageSize } from "../export/imageSize.js";
import { writeAtomic } from "../storage/atomicWrite.js";
import { joinPath, type FileSystem } from "../storage/fileSystem.js";
import { setAside } from "../storage/setAside.js";
import { t } from "../i18n/i18n.js";

/** The size e-book shops ask for, in pixels. */
export const COVER_MINIMUM = { width: 1600, height: 2560 };

const COVER_NAMES: Record<ImageSize["type"], string> = { jpeg: "cover.jpg", png: "cover.png" };

export interface CoverPicture {
  fileName: string;
  bytes: Uint8Array;
  size: ImageSize;
}

/** Null without one. */
export async function findCover(fileSystem: FileSystem, dir: string): Promise<CoverPicture | null> {
  const names = await fileSystem.list(dir);
  for (const fileName of Object.values(COVER_NAMES)) {
    if (!names.includes(fileName)) continue;
    const bytes = await fileSystem.readBytes(joinPath(dir, fileName));
    const size = imageSize(bytes);
    if (size) return { fileName, bytes, size };
  }
  return null;
}

/** The old cover goes to trash/ rather than being overwritten. */
export async function saveCover(fileSystem: FileSystem, dir: string, bytes: Uint8Array) {
  const size = imageSize(bytes);
  if (!size) throw new Error(t("Omslaget måste vara en JPG eller PNG."));
  const names = await fileSystem.list(dir);
  for (const old of Object.values(COVER_NAMES)) {
    if (names.includes(old)) await setAside(fileSystem, dir, joinPath(dir, old), old);
  }
  await writeAtomic(fileSystem, joinPath(dir, COVER_NAMES[size.type]), bytes);
}

export const isCoverTooSmall = (size: ImageSize) =>
  size.width < COVER_MINIMUM.width || size.height < COVER_MINIMUM.height;
