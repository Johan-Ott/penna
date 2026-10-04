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
- Words per day live in the project's `stats.json` as `{ "2026-10-02": 812 }` (`project/stats.ts`).
  Each scene save adds what it changed (`onSaved` in `sceneSession.ts`), so moving or trashing
  scenes never counts as writing. The daily goal is `dailyGoal` in project.json.
- Search (Ctrl+F) covers the whole manuscript by default ("Hela manuset"). Other scenes are
  searched with the same prosemirror-search plugin as the editor (`editor/manuscriptSearch.ts`),
  so counts match. "Alla" writes every scene file and can be undone while no one wrote in them
  since (`app/manuscriptReplace.ts`, `app/useManuscriptSearch.ts`).
- Snapshots are copies of the scene file in `snapshots/<scene id>/2026-10-02T14-03.md`, marked
  `snapshot: automatisk|manuell` (`project/snapshots.ts`). An automatic one keeps the text from
  before a save when the scene had none, or when the text moved 100+ words from the last one.
  Restoring snapshots the current text first (`app/snapshotActions.ts`).
- Inställningar (Ctrl+, or the palette) lives in `app/settings/`. Writing settings (theme,
  font, spellcheck, Swedish typography) are in `penna.writing`; author name, default daily goal
  and automatic snapshots in `penna.app`. Editor switches are read through refs on every
  update (`useEditorView`), so changing them needs no new editor state.
- Views of a project (Skriv, Framsteg; G S / G F) are listed in `VIEWS` in `Sidebar.tsx` and held
  in `useWritingMode`. The writing area stays mounted but hidden in other views, so the editor
  keeps its scene and undo. Framsteg's numbers are pure functions in `project/progress.ts`; the
  goals (`dailyGoal`, `totalGoal`, `deadline`) live in project.json, written by `updateFields`.
- Export lives in `src/export/`: `book.ts` reads the manuscript in order (`bookOutline`) and every
  scene before anything is written; `standardManuscript.ts` builds the DOCX with `docx` (npm), as
  the spec decided. `platform.saveFile` asks where and writes the file whole (a download in the
  browser). An `ExportError` names the scene and the reason; nothing is saved then.
- EPUB is our own generator (`export/epub.ts` + `xhtml.ts`, zipped with jszip): mimetype first and
  uncompressed, a page per part and chapter, nav.xhtml, and a typographic SVG cover until the
  writer picks a picture (`cover.jpg`/`cover.png` in the project folder, `project/cover.ts`; an
  older picture goes to trash/). The book id (ISBN, else `bookId` in project.json) stays between exports.
  Check an exported book with W3C epubcheck (needs Java): `java -jar epubcheck.jar bok.epub`.
- Import lives in `src/import/`, used by onboarding's Importera. Every format becomes Markdown and
  then a book (`ImportedNode[]`, `markdownImport.ts`): with two heading levels the top is parts and
  the next chapters, deeper headings name scenes, and `***` splits scenes. DOCX goes through
  mammoth's HTML (`docxImport.ts`); Scrivener is picked by its .scrivx, whose binder's draft gives
  the tree and each text's RTF (`scrivenerImport.ts`, `rtf.ts`). `paragraphs.ts` writes the text
  with the editor's own serializer, so escaping matches a saved scene. `createProject` takes the book.
- Characters and places are ordinary scene files in the fixed tree folders Karaktärer and Platser
  (`project/cards.ts`; a decided change from the spec's entities.json, see docs/spec.md). The
  title is the name. Planera (G P) is only an overview of those folders; mentions are counted
  from the titles in the manuscript text, never stored. The palette finds them too.
- Names of cards are underlined in the open scene by a decoration plugin (`editor/mentions.ts`);
  nothing is written into the scene file. The editor only gets `{ id, pattern }` pairs from
  `useMentionLinks`; a click shows `MentionCard` with how the card's text begins.
- Granskning (`app/review/`) works on the open scene only, as the spec says of visible text:
  repeated words (`manuscript/review.ts`, dots via `editor/repetitionMarks.ts`, sentences counted
  across paragraphs, names and small common words left out) and names one or two letters from a
  card title. "Ändra alla" replaces in the whole manuscript through the search's replace, so Ångra
  undoes it in one step; "Ignorera" keeps the word in `ignoredNames` in project.json.
- Comments live in `comments/<scene id>.json` in the spec's shape (`project/comments.ts`), anchored
  by quote, prefix and suffix and found again with `locate`, so they survive edits; a reply is a
  comment with `replyTo` (our addition). Ctrl+Shift+M on a selection starts one; they show in the
  review panel (`app/review/`), which appears when Granskning is on or the scene has comments.
  `useComments` lives in the app state, so the selection bar (`SelectionBar.tsx`: bold, italic,
  style, comment) reaches it too. Right-click keeps the system menu for its spelling suggestions.
- Spellcheck uses WebView2's language, set by `--lang` in tauri.conf.json's additionalBrowserArgs
  (WebView2 otherwise follows the Windows display language, not the page's `lang`).
- Editor switches (typewriter, typography, spellcheck, mentions, repetitions, comments) are one
  object, `editor.modes.current`, read by ProseMirror on every update.
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
