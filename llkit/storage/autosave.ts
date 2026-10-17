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
  isPaused: boolean;
  /** The text on its way to disk, so the folder watcher's news of it is known as ours. */
  writing: string | null;
  hasFailed: boolean;
  timer: ReturnType<typeof setTimeout> | undefined;
  queue: Promise<boolean>;
}

export function createAutosave(options: AutosaveOptions) {
  const { saveDelayMs = 1000, retryDelayMs = 10_000 } = options;
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
      if (!state.isHeld && !state.isPaused) schedule(saveDelayMs);
    },
    loaded(text: string) {
      clearTimeout(state.timer);
      state.savedText = text;
      state.currentText = text;
    },
    hold: () => void (state.isHeld = true),
    release: () => void (state.isHeld = false),
    /** While a sync writes over the file, for a moment. */
    pause: (isPaused: boolean) => void (state.isPaused = isPaused),
    flush,
    lastSavedText: () => state.savedText,
    isOwnText: (text: string) => text === state.savedText || text === state.writing,
  };
}

function emptyState(): AutosaveState {
  return {
    savedText: "",
    currentText: "",
    isHeld: false,
    isPaused: false,
    writing: null,
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
  if (needsWrite && (state.isHeld || state.isPaused)) return false;
  try {
    state.writing = text;
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
  } finally {
    state.writing = null;
  }
}
