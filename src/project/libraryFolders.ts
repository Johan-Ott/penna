import { t } from "../i18n/i18n.js";
export interface LibraryCandidate {
  id: string;
  label: string;
  hint: string;
  /** Its parent is the cloud folder, which must already exist. */
  path: string;
}

interface KnownFolders {
  home: string;
  documents: string;
}

/** The platform shows only the cloud folders that exist on this computer. */
export function libraryCandidates({ home, documents }: KnownFolders): LibraryCandidate[] {
  const appleSync = "Mac, iPhone, iPad";
  return [
    { id: "icloud", label: "iCloud Drive", hint: appleSync, path: `${home}/iCloudDrive/Penna` },
    {
      id: "icloud-mac",
      label: "iCloud Drive",
      hint: appleSync,
      path: `${home}/Library/Mobile Documents/com~apple~CloudDocs/Penna`,
    },
    { id: "dropbox", label: "Dropbox", hint: t("Alla enheter"), path: `${home}/Dropbox/Penna` },
    { id: "onedrive", label: "OneDrive", hint: t("Alla enheter"), path: `${home}/OneDrive/Penna` },
    {
      id: "local",
      label: t("Bara den här enheten"),
      hint: t("Ingen synk"),
      path: `${documents}/Penna`,
    },
  ];
}

export const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));
