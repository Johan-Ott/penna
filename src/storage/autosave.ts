import { describeSaveError, type SaveFailure } from "./saveError.js";

export type SaveStatus = { kind: "saved" } | { kind: "failed"; reason: SaveFailure };

export interface AutosaveOptions {
  write: (text: string) => Promise<void>;
  onStatus: (status: SaveStatus) => void;
  saveDelayMs?: number;
  retryDelayMs?: number;
}

interface AutosaveState {
  savedText: string;
  currentText: string;
  isHeld: boolean;
  hasFailed: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  queue: Promise<boolean>;
}

export function createAutosave(options: AutosaveOptions) {
  const saveDelayMs = options.saveDelayMs ?? 1000;
  const retryDelayMs = options.retryDelayMs ?? 10_000;
  const state = emptyState();
  const schedule = (delayMs: number) => {
    clearTimeout(state.timer);
    state.timer = setTimeout(() => void flush(), delayMs);
  };
  // Saves run one at a time, so an older text can never land on disk after a newer one.
  const flush = () => {
    clearTimeout(state.timer);
    state.queue = state.queue.then(() => attemptSave(state, options, () => schedule(retryDelayMs)));
    return state.queue;
  };
  return {
    changed(text: string) {
      state.currentText = text;
      if (!state.isHeld) schedule(saveDelayMs);
    },
    loaded(text: string) {
      clearTimeout(state.timer);
      state.savedText = text;
      state.currentText = text;
    },
    hold: () => void (state.isHeld = true),
    release: () => void (state.isHeld = false),
    flush,
    hasUnsavedText: () => state.currentText !== state.savedText,
    lastSavedText: () => state.savedText,
  };
}

function emptyState(): AutosaveState {
  return {
    savedText: "",
    currentText: "",
    isHeld: false,
    hasFailed: false,
    timer: undefined,
    queue: Promise.resolve(true),
  };
}

async function attemptSave(
  state: AutosaveState,
  options: AutosaveOptions,
  scheduleRetry: () => void,
): Promise<boolean> {
  const text = state.currentText;
  const needsWrite = text !== state.savedText;
  if (needsWrite && state.isHeld) return false;
  try {
    if (needsWrite) await options.write(text);
    state.savedText = text;
    if (needsWrite || state.hasFailed) options.onStatus({ kind: "saved" });
    state.hasFailed = false;
    return true;
  } catch (error) {
    state.hasFailed = true;
    options.onStatus({ kind: "failed", reason: describeSaveError(error) });
    scheduleRetry();
    return false;
  }
}
