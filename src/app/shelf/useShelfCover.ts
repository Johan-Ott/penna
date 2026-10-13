import { useEffect, useState } from "react";
import { findCover, type CoverPicture } from "../../project/cover.js";
import { usePictureUrl } from "../exporting/useCover.js";
import { platform } from "../platform.js";

/** The book's cover picture as an image URL, or null while it is read or when it has none. */
export function useShelfCover(dir: string): string | null {
  const [picture, setPicture] = useState<CoverPicture | null>(null);
  useEffect(() => {
    let isCurrent = true;
    // A cover that cannot be read leaves the plain cover, as for a book without one.
    findCover(platform.fileSystem, dir)
      .then((found) => isCurrent && setPicture(found))
      .catch(() => isCurrent && setPicture(null));
    return () => {
      isCurrent = false;
    };
  }, [dir]);
  return usePictureUrl(picture);
}
