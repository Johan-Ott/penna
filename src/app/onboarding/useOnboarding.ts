import { useEffect, useState } from "react";
import {
  libraryCandidates,
  parentOf,
  type LibraryCandidate,
} from "../../project/libraryFolders.js";
import {
  copyExampleProject,
  createProject,
  type ProjectDetails,
} from "../../project/newProject.js";
import { importManuscript } from "../../import/importManuscript.js";
import { ImportError } from "../../import/markdownImport.js";
import { platform, type PickedFile } from "../platform.js";
import { t } from "../../i18n/i18n.js";

export type ProjectMode = "new" | "import" | "open";

export const LAST_STEP = 5;

const START_DETAILS: ProjectDetails = { title: "", type: "roman", dailyGoal: 1000, deadline: "" };

// The cloud folders that exist on this computer, and always "Bara den här enheten".
async function availableLibraries(): Promise<LibraryCandidate[]> {
  const candidates = libraryCandidates(await platform.knownFolders());
  const checks = await Promise.all(
    candidates.map(
      (candidate) => candidate.id === "local" || platform.folderExists(parentOf(candidate.path)),
    ),
  );
  return candidates.filter((_candidate, index) => checks[index]);
}

function useLibraryChoice(knownLibraryDir: string | null) {
  const [libraries, setLibraries] = useState<LibraryCandidate[]>([]);
  const [libraryDir, setLibraryDir] = useState<string | null>(knownLibraryDir);
  useEffect(() => {
    void availableLibraries().then((found) => {
      setLibraries(found);
      setLibraryDir((current) => current ?? found[0]?.path ?? null);
    });
  }, []);
  const chooseOther = async () => {
    const picked = await platform.pickFolder();
    if (picked) setLibraryDir(picked);
  };
  return { libraries, libraryDir, setLibraryDir, chooseOther };
}

/** The steps of the first start: welcome, promises, folder, first project, done. */
/** Where the onboarding starts: the folder Penna knows, the step, and the goal to suggest. */
export interface OnboardingStart {
  knownLibraryDir: string | null;
  startStep: number;
  defaultDailyGoal: number;
}

export function useOnboarding({ knownLibraryDir, startStep, defaultDailyGoal }: OnboardingStart) {
  const [step, setStep] = useState(startStep);
  const [mode, setMode] = useState<ProjectMode>("new");
  const [details, setDetails] = useState({ ...START_DETAILS, dailyGoal: defaultDailyGoal });
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const library = useLibraryChoice(knownLibraryDir);
  const attempt = async (work: () => Promise<void>, failure: string) => {
    setProblem(null);
    try {
      await work();
    } catch (error) {
      setProblem(error instanceof ImportError ? error.message : failure);
    }
  };
  return {
    step,
    setStep,
    mode,
    setMode,
    details,
    setDetails,
    projectDir,
    setProjectDir,
    problem,
    attempt,
    ...library,
  };
}

export type OnboardingState = ReturnType<typeof useOnboarding>;

/** What "Fortsätt" does on each step. Folder and project steps write to disk first. */
export async function continueFrom(state: OnboardingState) {
  const { step, libraryDir } = state;
  if (step === 3 && libraryDir) {
    await state.attempt(async () => {
      await platform.fileSystem.makeDir(libraryDir);
      state.setStep(4);
    }, t("Mappen kunde inte skapas. Välj en annan plats."));
    return;
  }
  if (step === 4 && libraryDir) {
    await state.attempt(async () => {
      state.setProjectDir(
        (await createProject(platform.fileSystem, libraryDir, state.details)).dir,
      );
      state.setStep(5);
    }, t("Projektet kunde inte skapas. Kontrollera att mappen går att skriva till."));
    return;
  }
  state.setStep(Math.min(LAST_STEP, step + 1));
}

export async function openExample(state: OnboardingState) {
  const libraryDir = state.libraryDir;
  if (!libraryDir) return;
  await state.attempt(async () => {
    state.setProjectDir(await copyExampleProject(platform.fileSystem, libraryDir));
    state.setStep(5);
  }, t("Exempelprojektet kunde inte sparas i mappen."));
}

/** Writes the picked manuscript as a new project, named after the file unless a title is set. */
export async function importFile(state: OnboardingState, picked: PickedFile) {
  const libraryDir = state.libraryDir;
  if (!libraryDir) return;
  await state.attempt(async () => {
    const { title, book } = await importManuscript(platform.fileSystem, picked);
    const details = { ...state.details, title: state.details.title.trim() || title };
    state.setProjectDir((await createProject(platform.fileSystem, libraryDir, details, book)).dir);
    state.setStep(5);
  }, t("Filen kunde inte läsas. Spara den som .docx eller text och försök igen."));
}

export async function openExisting(state: OnboardingState) {
  const picked = await platform.pickFolder();
  if (!picked) return;
  state.setProjectDir(picked);
  state.setStep(5);
}
