# Penna

- Spec: https://claude.ai/artifact/X69SvjmxRQrtJjVszL9Qsn
- Design: https://claude.ai/artifact/L7PB4FUJKpiCT2wjDWzepd
- Short summary: docs/spec.md

Local-first writing app for novelists. Tauri 2, TypeScript, React, ProseMirror.
No server, no accounts, no AI. Text lives as plain files in a folder the user picks.

Code rules: @.claude/rules/code-quality.md

Run `npm run check` before saying a task is done. A Stop hook runs it too and blocks once if it fails.

## Layout

- `src/manuscript/`: scene files. Markdown is read into ProseMirror and written back; every
  block keeps the text it was read from, so untouched blocks are saved byte for byte.
- `src/storage/`: everything that touches disk goes through the `FileSystem` interface
  (`nodeFileSystem` in tests, `tauriFileSystem` in the app, `memoryFileSystem` in a browser).
- `src/project/`: project.json and the tree (parts, chapters, scenes, folders). Tree edits are
  pure functions in `tree.ts`. A scene node has no title: the title lives in the scene file's
  front matter, so moving a scene changes project.json only. Research and Papperskorg always
  exist (ids `research`, `trash`).
- `src/editor/`: ProseMirror commands, keys, Swedish typography, search panel, focus and
  typewriter plugins. Writing settings (`writingSettings.ts`) are per writer, kept in the
  webview's localStorage until the Inställningar screen exists. Typography applies everywhere;
  focus dimming and typewriter only in the focus mode (Ctrl+Shift+F, Esc leaves).
- `src/app/`: React. Logic sits in plain modules (`sceneSession.ts`); hooks and components
  only hold React state. `platform.ts` picks Tauri or the in-browser example project.
- `src/app/Menu.tsx` is the only menu: right-click, the add button and the style picker. Tree menu
  contents come from `tree/treeMenus.ts`. The command palette (Ctrl+K) lives in `app/palette/`;
  new commands go in `paletteEntries.ts`.
- The editor is read-only whenever no scene is open, so text can never be typed into nowhere.
- Start: `useStartup` reopens the last project if its folder still exists; otherwise the
  onboarding runs the first time (`app/onboarding/`) and the bookshelf (`app/shelf/`) after
  that. App preferences (onboarding done, the Penna library folder, last project, projects
  opened from elsewhere) live in localStorage (`appPreferences.ts`). New projects are made in
  the library folder by `project/newProject.ts`.
- The shelf shows every `.penna` folder in the library plus `knownProjects`. Book status and
  progress come from the scenes' `status` in front matter (`project/shelf.ts`). A folder that
  is gone shows as "Hittas inte"; Penna never deletes it, only forgets it on request.
- Sync copies, crash temp files and iCloud placeholders are found when a project is read
  (`storage/syncFiles.ts`, `atomicWrite.ts`) and settled in `app/syncRepairs.ts`. What the
  writer chooses away goes to the project's `trash/` folder, never deleted. Crash text is settled
  in a dialog before any scene opens, because the next save would write over the temp file.
- Tauri may read and write under $HOME and $DOCUMENT without a dialog (capabilities), and
  `tauri-plugin-persisted-scope` keeps folders picked in the dialog across restarts.
- `npm run icons` rebuilds the app icons from `src-tauri/icons/icon-source.svg`.
- `src-tauri/`: plugin setup only. Permissions are in `capabilities/default.json`.

## Running

- `npm run dev` starts the Tauri window. Johan runs it; Claude does not start windows.
- `npm run dev:web` serves the same app in a browser against the example project in memory.
  Start it with `--host 127.0.0.1` for Claude's browser pane, which can not reach `::1`.
- Typing tests in the browser pane: the pane's `type` action pastes whole strings, so input
  rules (typography) only fire with `document.execCommand("insertText")` one character at a time.
- Stopping a background `npx vite` leaves its node process on port 1420; stop that process too,
  or the next server serves stale modules.
