import { isTauri } from "@tauri-apps/api/core";
import { provideAppName } from "@llkit/appInfo.js";
import { provideFeedbackAddress } from "@llkit/feedback/sendFeedback.js";
import { provideDevice } from "@llkit/platform/device.js";
import type { BasePlatform } from "@llkit/platform/types.js";
import { browserPlatform } from "./browserPlatform.js";
import { tauriPlatform } from "./tauriPlatform.js";

export type {
  AppUpdate,
  FileKind,
  PickedFile,
  PickKind,
  WindowControls,
} from "@llkit/platform/types.js";

/** Penna's platform: llkit's device, and what only Penna does with it. */
export interface Platform extends BasePlatform {
  /** Tools on this computer may drive Penna for the next start only; open is this start. */
  remoteControl?: (turnOn?: boolean) => Promise<RemoteState>;
  /** Missing where Penna cannot sign in: the browser, and iPad for now. */
  googleSignIn?: GoogleSignIn;
  /** Asks first; true when the book was removed. Missing in the browser version. */
  /** `isEverywhere`: the question says the copy in Drive goes too; the caller removes it. */
  removeBook?: (dir: string, title: string, isEverywhere?: boolean) => Promise<boolean>;
  /** Copies of every book in Penna's own folder. Missing in the browser version. */
  backups?: Backups;
  /** Penna's own spelling check; missing in the browser, which checks the spelling itself. */
  spelling?: Spelling;
  /** Typst's compiler, fetched once by the apps; missing in the browser, where it comes along. */
  typstCompiler?: () => Promise<ArrayBuffer>;
  /** Fetches the compiler now, as the first start does; missing in the browser. */
  prepareTypst?: () => Promise<void>;
  /** What has been fetched: the dictionaries' languages and the compiler; missing in the browser. */
  fetchedParts?: () => Promise<{ dictionaries: string[]; hasTypst: boolean }>;
}

export interface Spelling {
  /** The words the language's dictionary does not know; fails when there is no dictionary. */
  misspelled(language: string, words: string[]): Promise<string[]>;
  /** Every language's dictionary is fetched the first time it is needed, then kept. */
  suggestions(language: string, word: string): Promise<string[]>;
  /** Fetches the language's dictionary now, as the first start does for the chosen ones. */
  prepare(language: string): Promise<void>;
}

export interface Backups {
  /** With forward slashes. */
  dir(): Promise<string>;
  /** Removes one old copy; refuses anything outside the copies' folder. */
  remove(path: string): Promise<void>;
}

export interface GoogleSignIn {
  /** Shows Google's account choice and consent. */
  connect(): Promise<void>;
  /** Never asks; fails when the writer must connect again. */
  accessToken(): Promise<string>;
  disconnect(): Promise<void>;
  /** Not stopped by the browser's cross-site rules. */
  fetch: typeof fetch;
}

export interface RemoteState {
  isOpen: boolean;
  isNext: boolean;
}

export const platform: Platform = isTauri() ? tauriPlatform : browserPlatform;
provideDevice(platform);
provideAppName("Penna");
provideFeedbackAddress("johan.lonelodge@gmail.com");
