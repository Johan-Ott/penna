export interface SceneFileRef {
  sceneId: string;
  fileName: string;
}

export interface SceneFolderListing {
  scenes: string[];
  /** Copies a sync service made next to a scene. Never deleted automatically. */
  conflicts: SceneFileRef[];
  /** iCloud placeholders: the scene exists but is not on this device yet. */
  notDownloaded: SceneFileRef[];
}

// Scene ids are ULIDs (Crockford base32), so a space, "(" or "-" after the id can only
// come from a sync service renaming a copy.
const SCENE_ID = "[0-9A-HJKMNP-TV-Z]+";
const PLAIN_SCENE = new RegExp(`^(${SCENE_ID})\\.md$`);
const CONFLICT_COPY = new RegExp(`^(${SCENE_ID})[ (-].*\\.md$`);
const ICLOUD_PLACEHOLDER = new RegExp(`^\\.(${SCENE_ID})\\.md\\.icloud$`);

export function classifySceneFiles(names: string[]): SceneFolderListing {
  const listing: SceneFolderListing = { scenes: [], conflicts: [], notDownloaded: [] };
  for (const fileName of names) {
    const plain = PLAIN_SCENE.exec(fileName);
    const conflict = CONFLICT_COPY.exec(fileName);
    const placeholder = ICLOUD_PLACEHOLDER.exec(fileName);
    if (plain?.[1]) listing.scenes.push(plain[1]);
    else if (conflict?.[1]) listing.conflicts.push({ sceneId: conflict[1], fileName });
    else if (placeholder?.[1]) listing.notDownloaded.push({ sceneId: placeholder[1], fileName });
  }
  return listing;
}

export type ExternalChange = "unchanged" | "reload" | "conflict";

export interface OpenSceneTexts {
  diskText: string;
  /** What Penna last wrote to or read from disk. */
  lastSavedText: string;
  editorText: string;
}

/** What to do when the file watcher reports that an open scene changed on disk. */
export function decideExternalChange(texts: OpenSceneTexts): ExternalChange {
  const { diskText, lastSavedText, editorText } = texts;
  if (diskText === lastSavedText || diskText === editorText) return "unchanged";
  if (editorText === lastSavedText) return "reload";
  return "conflict";
}
