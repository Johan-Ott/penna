import { DEMO_PROJECT_DIR, DEMO_PROJECT_FILES } from "../demo/demoProject.js";
import { createMemoryFileSystem } from "../storage/memoryFileSystem.js";
import type { Platform } from "./platform.js";

export const browserPlatform: Platform = {
  fileSystem: createMemoryFileSystem(DEMO_PROJECT_FILES),
  isDemo: true,
  pickFolder: async () => DEMO_PROJECT_DIR,
  watchFolder: async () => () => undefined,
  guardClose: () => () => undefined,
};
