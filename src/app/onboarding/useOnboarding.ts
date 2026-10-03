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
import { platform } from "../platform.js";

export type ProjectMode = "new" | "open";

export const LAST_STEP = 5;

const START_DETAILS: ProjectDetails = { title: "", type: "roman", dailyGoal: 1000, deadline: "" };

// The cloud folders that exist on this computer, and always "Bara den här datorn".
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
export function useOnboarding(knownLibraryDir: string | null, startStep: number) {
  const [step, setStep] = useState(startStep);
  const [mode, setMode] = useState<ProjectMode>("new");
  const [details, setDetails] = useState(START_DETAILS);
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const library = useLibraryChoice(knownLibraryDir);
  const attempt = async (work: () => Promise<void>, failure: string) => {
    setProblem(null);
    try {
      await work();
    } catch {
      setProblem(failure);
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
    }, "Mappen kunde inte skapas. Välj en annan plats.");
    return;
  }
  if (step === 4 && libraryDir) {
    await state.attempt(async () => {
      state.setProjectDir(
        (await createProject(platform.fileSystem, libraryDir, state.details)).dir,
      );
      state.setStep(5);
    }, "Projektet kunde inte skapas. Kontrollera att mappen går att skriva till.");
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
  }, "Exempelprojektet kunde inte sparas i mappen.");
}

export async function openExisting(state: OnboardingState) {
  const picked = await platform.pickFolder();
  if (!picked) return;
  state.setProjectDir(picked);
  state.setStep(5);
}
