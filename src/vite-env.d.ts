/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The computer client's secret from Google Cloud, kept in .env.local and never in git. */
  readonly VITE_GOOGLE_COMPUTER_SECRET?: string;
}
