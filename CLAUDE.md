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
- `src-tauri/`: plugin setup only. Permissions are in `capabilities/default.json`.

## Running

- `npm run dev` starts the Tauri window. Johan runs it; Claude does not start windows.
- `npm run dev:web` serves the same app in a browser against the example project in memory.
  Start it with `--host 127.0.0.1` for Claude's browser pane, which can not reach `::1`.
- Typing tests in the browser pane: the pane's `type` action pastes whole strings, so input
  rules (typography) only fire with `document.execCommand("insertText")` one character at a time.
- Stopping a background `npx vite` leaves its node process on port 1420; stop that process too,
  or the next server serves stale modules.
