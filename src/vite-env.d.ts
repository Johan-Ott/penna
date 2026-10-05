/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kept in .env.local, never in git. */
  readonly VITE_GOOGLE_COMPUTER_SECRET?: string;
}
