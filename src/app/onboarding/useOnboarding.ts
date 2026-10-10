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
import { suggestedStructure } from "../../project/templates.js";
import { importManuscript } from "../../import/importManuscript.js";
import { ImportError } from "../../import/markdownImport.js";
import { platform, type PickedFile } from "../platform.js";
import { t } from "../../i18n/i18n.js";

export type ProjectMode = "new" | "import" | "open";

export const LAST_STEP = 5;

/** A new book is four questions: what kind, which pieces, Penna's suggestion, title and goal. */
export const BOOK_STEPS = 4;

const START_DETAILS: ProjectDetails = {
  title: "",
  type: "roman",
  structure: "tom",
  pieces: [],
  dailyGoal: 1000,
  deadline: "",
};

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

export interface OnboardingStart {
  knownLibraryDir: string | null;
  startStep: number;
  defaultDailyGoal: number;
}

// Work that writes to disk; what went wrong is shown on the step instead of thrown.
function useAttempt() {
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = async (work: () => Promise<void>, failure: string) => {
    setProblem(null);
    try {
      await work();
    } catch (error) {
      setProblem(error instanceof ImportError ? error.message : failure);
    }
  };
  return { problem, attempt };
}

export function useOnboarding({ knownLibraryDir, startStep, defaultDailyGoal }: OnboardingStart) {
  const [step, setStep] = useState(startStep);
  const [mode, setMode] = useState<ProjectMode>("new");
  const [bookStep, setBookStep] = useState(1);
  const [details, setDetails] = useState({ ...START_DETAILS, dailyGoal: defaultDailyGoal });
  const [projectDir, setProjectDir] = useState<string | null>(null);
  const library = useLibraryChoice(knownLibraryDir);
  return {
    step,
    setStep,
    mode,
    setMode,
    bookStep,
    setBookStep,
    details,
    setDetails,
    projectDir,
    setProjectDir,
    ...useAttempt(),
    ...library,
  };
}

export type OnboardingState = ReturnType<typeof useOnboarding>;

const isAsking = (state: OnboardingState) => state.step === 4 && state.mode === "new";

// A fackbok has no story for the pieces, so it skips that question. The suggestion is made as
// the writer reaches it, from what they answered so far.
function nextBookStep(state: OnboardingState) {
  const { bookStep, details } = state;
  const skipsPieces = bookStep === 1 && details.type === "fackbok";
  const pieces = skipsPieces ? [] : details.pieces;
  const next = skipsPieces ? 3 : bookStep + 1;
  if (next === 3)
    state.setDetails({ ...details, pieces, structure: suggestedStructure(details.type, pieces) });
  state.setBookStep(next);
}

/** Back one question in the new book, or one step in the onboarding. */
export function goBack(state: OnboardingState) {
  if (!isAsking(state) || state.bookStep === 1) return state.setStep(state.step - 1);
  const skipped = state.bookStep === 3 && state.details.type === "fackbok";
  state.setBookStep(skipped ? 1 : state.bookStep - 1);
}

/** The folder and project steps write to disk before moving on. */
export async function continueFrom(state: OnboardingState) {
  const { step, libraryDir } = state;
  if (isAsking(state) && state.bookStep < BOOK_STEPS) return nextBookStep(state);
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
