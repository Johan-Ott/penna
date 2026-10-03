import { useCallback, useEffect, useState } from "react";
import { findCover, saveCover, type CoverPicture } from "../../project/cover.js";
import { platform } from "../platform.js";
import type { Project } from "../useProject.js";

/** The project's cover picture, with a URL the page can show, and a way to pick a new one. */
export function useCover(project: Project) {
  const [picture, setPicture] = useState<CoverPicture | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const dir = project.dir;
  const reload = useCallback(
    async () => setPicture(await findCover(platform.fileSystem, dir)),
    [dir],
  );
  useEffect(() => void reload(), [reload]);
  const url = usePictureUrl(picture);
  const choose = async () => {
    const bytes = await platform.pickImage();
    if (!bytes) return;
    try {
      await saveCover(platform.fileSystem, dir, bytes);
      setProblem(null);
      await reload();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Bilden kunde inte sparas.");
    }
  };
  return { picture, url, problem, choose: () => void choose() };
}

// An object URL lives until it is revoked, so the old one goes when the picture changes.
function usePictureUrl(picture: CoverPicture | null) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!picture) return setUrl(null);
    const blob = new Blob([picture.bytes.slice()], { type: `image/${picture.size.type}` });
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [picture]);
  return url;
}
