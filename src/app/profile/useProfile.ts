import { useCallback, useEffect, useState } from "react";
import { writeAtomic } from "../../storage/atomicWrite.js";
import { joinPath } from "../../storage/fileSystem.js";
import { recordFailure } from "../errorLog.js";
import { libraryOf } from "../journey/journeyFile.js";
import { platform } from "../platform.js";

/** What the writer says about themselves; the name itself lives in the settings, as before. */
export interface Profile {
  about: string;
  link: string;
  /** A small picture as a data URL, or empty for the first letter of the name. */
  picture: string;
}

const NO_PROFILE: Profile = { about: "", link: "", picture: "" };
const profilePath = (library: string) => joinPath(library, "profil.json");
const text = (value: unknown) => (typeof value === "string" ? value : "");

function profileFrom(fileText: string): Profile {
  try {
    const parsed = JSON.parse(fileText) as Record<string, unknown>;
    return {
      about: text(parsed["about"]),
      link: text(parsed["link"]),
      picture: text(parsed["picture"]),
    };
  } catch {
    return NO_PROFILE;
  }
}

/** The profile in the Penna folder, so every device with the folder has it. No account. */
export function useProfile(libraryDir: string | null) {
  const [profile, setProfile] = useState(NO_PROFILE);
  const [isOpen, setOpen] = useState(false);
  useEffect(() => {
    void libraryOf(libraryDir)
      .then((library) => platform.fileSystem.readText(profilePath(library)))
      .then((fileText) => setProfile(profileFrom(fileText)))
      .catch(() => setProfile(NO_PROFILE));
  }, [libraryDir]);
  const save = useCallback(
    (next: Profile) => {
      setProfile(next);
      void libraryOf(libraryDir)
        .then(async (library) => {
          await platform.fileSystem.makeDir(library);
          await writeAtomic(
            platform.fileSystem,
            profilePath(library),
            `${JSON.stringify(next, null, 2)}\n`,
          );
        })
        .catch(recordFailure("Profilen kunde inte sparas"));
    },
    [libraryDir],
  );
  return { profile, save, isOpen, open: () => setOpen(true), close: () => setOpen(false) };
}

export type ProfileState = ReturnType<typeof useProfile>;
