/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Kept in .env.local, never in git. */
  readonly VITE_GOOGLE_COMPUTER_SECRET?: string;
  /** Where feedback is sent, such as https://formspree.io/f/abcd1234. */
  readonly VITE_FEEDBACK_URL?: string;
}
