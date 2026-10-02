# Penna

- Spec: https://claude.ai/artifact/X69SvjmxRQrtJjVszL9Qsn
- Design: https://claude.ai/artifact/L7PB4FUJKpiCT2wjDWzepd
- Short summary: docs/spec.md

Local-first writing app for novelists. Tauri 2, TypeScript, React, ProseMirror.
No server, no accounts, no AI. Text lives as plain files in a folder the user picks.

Code rules: @.claude/rules/code-quality.md

Run `npm run check` before saying a task is done. A Stop hook runs it too and blocks once if it fails.

## Layout

- `src/storage/`: everything that touches disk goes through the `FileSystem` interface.
  `nodeFileSystem` is used by tests, `tauriFileSystem` by the app.
- `ui/`: the spike shell, plain TypeScript without React yet. `npm run build:ui` compiles it to
  `ui/build/` without a bundler, so imports in `src/storage` keep their `.js` extension.
- `src-tauri/`: plugin setup only. Permissions are in `capabilities/default.json`.
- `npm run dev` starts the Tauri window. Johan runs it; Claude does not start windows.
