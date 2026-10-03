import type { Node } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useRef, useState } from "react";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { createEditorState, type EditorSwitches } from "./editorState.js";

function createView(
  element: HTMLElement,
  switches: ViewSwitches,
  onState: (state: EditorState, docChanged: boolean) => void,
) {
  const view: EditorView = new EditorView(element, {
    state: createEditorState(schema.node("doc"), switches),
    editable: switches.isEditable,
    attributes: () => ({ spellcheck: switches.isSpellcheckOn() ? "true" : "false" }),
    dispatchTransaction(transaction) {
      const next = view.state.apply(transaction);
      view.updateState(next);
      onState(next, transaction.docChanged);
    },
  });
  return view;
}

interface ViewSwitches extends EditorSwitches {
  isEditable: () => boolean;
  isSpellcheckOn: () => boolean;
}

// ProseMirror asks these on every update, so the app can switch them without a new state.
function useModeSwitches() {
  const typewriterRef = useRef(false);
  const typographyRef = useRef(true);
  const spellcheckRef = useRef(true);
  const editableRef = useRef(false);
  const [switches] = useState<ViewSwitches>(() => ({
    isTypewriterOn: () => typewriterRef.current,
    isTypographyOn: () => typographyRef.current,
    isSpellcheckOn: () => spellcheckRef.current,
    isEditable: () => editableRef.current,
  }));
  return { switches, refs: { typewriterRef, typographyRef, spellcheckRef, editableRef } };
}

// A hidden editor can not take focus. A request made while it is hidden is kept until
// `focusIfRequested` runs after the editor is shown.
function useFocusRequest(viewRef: React.RefObject<EditorView | null>) {
  const isRequested = useRef(false);
  const requestFocus = useCallback(() => {
    const view = viewRef.current;
    if (view?.dom.offsetParent) return view.focus();
    isRequested.current = true;
  }, [viewRef]);
  const focusIfRequested = useCallback(() => {
    if (!isRequested.current || !viewRef.current?.dom.offsetParent) return;
    isRequested.current = false;
    viewRef.current.focus();
  }, [viewRef]);
  return { requestFocus, focusIfRequested };
}

/** Owns one ProseMirror view. React re-renders on every transaction through `editorState`. */
export function useEditorView(onDocChange: (doc: Node) => void) {
  const viewRef = useRef<EditorView | null>(null);
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const { switches, refs } = useModeSwitches();
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  // The switches read refs and never change, so mount and load need no dependencies.
  const mount = useCallback((element: HTMLDivElement | null) => {
    viewRef.current?.destroy();
    viewRef.current = element
      ? createView(element, switches, (state, docChanged) => {
          setEditorState(state);
          if (docChanged) onDocChangeRef.current(state.doc);
        })
      : null;
    setEditorState(viewRef.current?.state ?? null);
  }, []);
  const load = useCallback((doc: Node) => {
    viewRef.current?.updateState(createEditorState(doc, switches));
    setEditorState(viewRef.current?.state ?? null);
  }, []);

  const run = useCallback((command: Command, shouldFocus = true) => {
    const view = viewRef.current;
    if (view && command(view.state, view.dispatch, view) && shouldFocus) view.focus();
  }, []);

  const focus = useFocusRequest(viewRef);
  return { mount, load, run, editorState, viewRef, ...refs, ...focus };
}
