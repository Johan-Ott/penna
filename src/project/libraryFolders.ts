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
    { id: "icloud", label: "iCloud Drive", hint: appleSync, path: `${home}/iCloudDrive/Skrivro` },
    {
      id: "icloud-mac",
      label: "iCloud Drive",
      hint: appleSync,
      path: `${home}/Library/Mobile Documents/com~apple~CloudDocs/Skrivro`,
    },
    { id: "dropbox", label: "Dropbox", hint: t("Alla enheter"), path: `${home}/Dropbox/Skrivro` },
    {
      id: "onedrive",
      label: "OneDrive",
      hint: t("Alla enheter"),
      path: `${home}/OneDrive/Skrivro`,
    },
    {
      id: "local",
      label: t("Bara den här enheten"),
      hint: t("Ingen synk"),
      path: `${documents}/Skrivro`,
    },
  ];
}

export const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

/** A book is a folder ending in .skrivro; books made while the app was called Penna end in .penna. */
export const BOOK_SUFFIX = ".skrivro";
export const withoutBookSuffix = (name: string) => name.replace(/\.(skrivro|penna)$/, "");
export const isBookFolder = (name: string) => withoutBookSuffix(name) !== name;
