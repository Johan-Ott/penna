import { useEffect, useRef } from "react";
import type { TreeNode } from "../project/tree.js";
import { nodeLabel } from "../project/treeLabels.js";
import { openInHome } from "./notes/noteHomes.js";
import { searchPalette } from "./palette/paletteSearch.js";
import type { AppState } from "./App.js";
import { runBatch } from "../project/batch.js";
import { bookCalls } from "./remoteBook.js";
import { settingCallsInApp } from "./remoteBookSettings.js";

// window.penna: the app's own commands and open book, for a tool on this computer to drive
// Penna with as a game's console does; everything goes through what the app already does.

type Row = { id: string; kind: TreeNode["kind"]; title: string; depth: number };

function rows(app: AppState): Row[] {
  const project = app.project;
  if (!project) return [];
  const walk = (nodes: TreeNode[], depth: number): Row[] =>
    nodes.flatMap((node) => [
      {
        id: node.id,
        kind: node.kind,
        title: nodeLabel(node, project.tree, project.summaries),
        depth,
      },
      ...walk(node.children ?? [], depth + 1),
    ]);
  return walk(project.tree, 0);
}

function findCommand(app: AppState, name: string) {
  const entries = app.palette.entriesNow();
  return (
    entries.find((entry) => entry.id === name) ??
    entries.find((entry) => entry.label.toLowerCase() === name.toLowerCase()) ??
    searchPalette(entries, name)[0]
  );
}

function stateOf(app: AppState) {
  return {
    book: app.project?.name ?? null,
    dir: app.project?.dir ?? null,
    view: app.writingMode.view,
    scene: app.scene ? { id: app.scene.id, title: app.scene.title } : null,
    todayWords: app.today.words,
  };
}

// The open text: what it says, and typing in it as the writer would.
const editorCalls = (current: () => AppState) => ({
  text: () => {
    const doc = current().editor.viewRef.current?.state.doc;
    return doc ? doc.textBetween(0, doc.content.size, "\n\n", " ") : "";
  },
  /** Typed at the cursor in the open text, and saved as anything typed is. */
  type: (text: string) =>
    current().editor.run((state, dispatch) => {
      dispatch?.(state.tr.insertText(text));
      return true;
    }),
});

function calls(current: () => AppState) {
  return {
    ...bookCalls(current),
    ...settingCallsInApp(current),
    state: () => stateOf(current()),
    tree: () => rows(current()),
    commands: () =>
      current()
        .palette.entriesNow()
        .map(({ id, label, group }) => ({ id, label, group })),
    /** A command by its id, its label or the best match, as the palette finds it. */
    run: (name: string) => {
      const entry = findCommand(current(), name);
      entry?.run();
      return entry?.label ?? null;
    },
    open: (id: string) => {
      const app = current();
      app.writingMode.setView("skriv");
      openInHome(app.session, app.homes, id);
    },
    ...editorCalls(current),
  };
}

function api(current: () => AppState) {
  const all = calls(current);
  return { ...all, batch: (steps: unknown) => runBatch(all, steps) };
}

export type PennaApi = ReturnType<typeof api>;

/** Puts window.penna in place for as long as the app runs. */
export function useRemote(app: AppState) {
  const latest = useRef(app);
  latest.current = app;
  useEffect(() => {
    const page = window as { penna?: PennaApi };
    page.penna = api(() => latest.current);
    return () => void delete page.penna;
  }, []);
}
