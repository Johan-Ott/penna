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
- `src/project/`: project.json and the tree (parts, chapters, scenes, folders, sorts). Tree edits
  are pure functions in `tree.ts`. A scene node has no title: the title lives in the scene file's
  front matter, so moving a scene changes project.json only. A chapter (or a loose scene) can hold
  `summary` and `when` for Innehåll. The sorts Personer, Platser, Saker, Övrigt (ids `karaktarer`,
  `platser`, `saker`, `anteckningar`) and Papperskorg (`trash`) always exist.
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
- Views of a project (Skriv, Innehåll, Publicera; G S / G I / G P) are listed in `VIEWS` in
  `useWritingMode.ts`. The writing area stays mounted but hidden in other views, so the editor
  keeps its scene and undo. Framsteg is a popover from the top bar; its numbers are pure functions in `project/progress.ts`; the
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
- Print PDF and Publicera's preview use Typst as WebAssembly in the web view (a decided change from the
  spec's Rust, see docs/spec.md), so the preview and the PDF come from one compilation path.
  `export/typstText.ts` turns scenes into Typst markup (every code character escaped),
  `typstTemplate.ts` holds the three themes (Klassisk, Modern, Luftig: headings and margins), the
  running head and folio and the anfang, which Typst measures to sink two lines into the text
  (the paragraph is passed as a list of words). `typstBook.ts` puts the book together and
  `typstCompile.ts` runs Typst with assets passed in: fetched in the app (`app/typstAssets.ts`),
  read from disk in tests. Fonts are static TTFs in `public/fonts` with their OFL licences; Typst
  never loads fonts from the internet. The design lives in project.json `design` (`bookDesign.ts`).
  The pages around the story are in `export/bookParts.ts`: cover, title, copyright and dedication
  before, thanks and about the author after. Their texts are `dedication`, `thanks` and
  `aboutAuthor` in project.json, written in Publicera's Bokuppgifter when the part is ticked.
- Import lives in `src/import/`, used by onboarding's Importera. Every format becomes Markdown and
  then a book (`ImportedNode[]`, `markdownImport.ts`): with two heading levels the top is parts and
  the next chapters, deeper headings name scenes, and `***` splits scenes. DOCX goes through
  mammoth's HTML (`docxImport.ts`); Scrivener is picked by its .scrivx, whose binder's draft gives
  the tree and each text's RTF (`scrivenerImport.ts`, `rtf.ts`). `paragraphs.ts` writes the text
  with the editor's own serializer, so escaping matches a saved scene. `createProject` takes the book.
- Notes are ordinary scene files in sorts (tree nodes of kind `sort`), shown under Anteckningar in
  the sidebar (`app/notes/`; a decided change from the spec's entities.json, see docs/spec.md).
  The title is the name. A note's name is linked in the text unless its front matter says
  `link: false`; in Övrigt only when it says `link: true` (`cards.ts`). The writer can add own
  sorts in Ny anteckning. Mentions are counted from the manuscript text, never stored; a note's
  page shows them under Nämns i. Connections ("Elin, brorsdotter") are project.json `connections`.
  Older projects' Karaktärer, Tidslinje and Research folders become sorts when they are read.
- Names of notes are underlined in the open scene by a decoration plugin (`editor/mentions.ts`);
  nothing is written into the scene file. The editor only gets `{ id, pattern }` pairs from
  `useMentionLinks`; a click shows `MentionCard`.
- The shell (`app/shell/`): the top bar (menu, sidebar, back and forward, Skriv or Publicera, the
  day's words that open Framsteg, search, focus), the sidebar beside a white card, and Publicera in
  their place. Innehåll lists chapters with what happens, when and status; Tidsordning is the
  order the writer drags them into (project.json `timeOrder`).
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
- The book's language is `language` in project.json (`project/bookLanguage.ts`, Swedish by
  default): spellcheck, the EPUB's and the DOCX's language, the export's starting quote style and
  the fixed words both formats print (`export/bookWords.ts`: Kapitel, Innehåll, "ca … ord").
  A new language is one entry in `BOOK_LANGUAGES` and one in `bookWords.ts`. WebView2 takes its dictionary from `--lang` when
  the window starts, not from the page's `lang`, so Rust creates the window (`main.rs`, the config
  window has `create: false`) with the language in `spell-language.txt` in the app config folder.
  `set_spell_language` saves a new one and restarts; `useSpellLanguage` calls it as a book opens.
- project.json carries `formatVersion` (`FORMAT_VERSION` in `projectFile.ts`, now 1), stamped on
  every write. A newer one opens read-only (`project.isReadOnly`): no project.json writes, no new
  scenes, the editor not editable. When format 2 comes, add its migration step in `readProjectFile`.
- The top bar shows today's words against the daily goal. The reminder (`reminder.ts`)
  sends a local notice after the chosen hour when nothing is written; it needs Penna open.
- Publicera's export reports progress per chapter while scenes are read (`bookMaterial` onProgress);
  Avbryt bumps the run number so an old run's file is never saved.
- Layout lives in `styles/shell.css`. Granska opens from the chip at the card's corner; under
  1200 px it covers the text. Under 960 px the sidebar starts hidden and floats over the card when
  shown (Ctrl+. or the sidebar button; `isSidebarOpen` in `useWritingMode`). The smallest window
  is 720 × 500.
- The top bar has no formatting buttons: bold, italic and style are on the selection bar, a scene
  break is typed as `***` on an empty line (an input rule in `editorState.ts`) or Ctrl+Enter.
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

## Releasing

- `npm run version -- 1.0.3` sets the version in package.json, tauri.conf.json and Cargo.toml.
  Commit, tag `v1.0.3` and push: `.github/workflows/release.yml` builds Windows and macOS with
  `tauri.release.conf.json` (bundling and updater files on) into a draft GitHub release.
- Publishing the draft makes its `latest.json` the newest; the app asks for it once at start
  (`UpdateNotice.tsx`) and offers to restart into the new version. Updates are signed: the public
  key is in tauri.conf.json, the private key is `~/.tauri/penna-updater.key` on Johan's computer
  and the GitHub secret `TAURI_SIGNING_PRIVATE_KEY`. Losing it means users must reinstall once.

## Interface language

- Every interface text goes through `t()` (`src/i18n/i18n.ts`) with the Swedish text as the key:
  `t("Ny scen")`, `t("{count} ord", { count })`. English lives in `src/i18n/en.json`. A test reads
  every `t("…")` in src and fails on a missing or unused English entry. ESLint allows `t` as a
  short name (id-length exceptions) for this.
- The language is set by `src/i18n/startLanguage.ts`, imported first in main.tsx, so lists made
  when modules load are translated too. Changing it in Inställningar saves and reloads.
- Book text is not interface text: exports use the book's language (`export/bookWords.ts`), and
  the fixed tree folders keep their Swedish titles in project.json but show translated.
