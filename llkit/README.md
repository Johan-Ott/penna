# llkit

What any llstudios app is built on. Penna is the first app on it.

- llkit knows nothing of the app: it never imports from `src/`. Lint stops it.
- The app imports it as `@llkit/...`, for example `import { store } from "@llkit/store.js"`.
- Texts: llkit's own are in `llkit/en.json`. An app hands in its English with `addEnglish` before
  anything is shown (Penna does it in `src/i18n/i18n.ts`).
- Something belongs here when a second app would want it as it is. Something with books, scenes or
  Penna's name in it stays in `src/`.

## In it now

- `store`, `useRootClass`, `tooltips`, `errorLog`, `thisComputer`, `i18n`
- `storage/`: the file system interface, atomic writes, autosave, save errors, key-value storage
