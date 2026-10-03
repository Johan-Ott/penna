import type { Node } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useRef, useState } from "react";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { createEditorState } from "./editorState.js";

function createView(
  element: HTMLElement,
  isTypewriterOn: () => boolean,
  isEditable: () => boolean,
  onState: (state: EditorState, docChanged: boolean) => void,
) {
  const view: EditorView = new EditorView(element, {
    state: createEditorState(schema.node("doc"), isTypewriterOn),
    editable: isEditable,
    dispatchTransaction(transaction) {
      const next = view.state.apply(transaction);
      view.updateState(next);
      onState(next, transaction.docChanged);
    },
  });
  return view;
}

/** Owns one ProseMirror view. React re-renders on every transaction through `editorState`. */
export function useEditorView(onDocChange: (doc: Node) => void) {
  const viewRef = useRef<EditorView | null>(null);
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const typewriterRef = useRef(false);
  const isTypewriterOn = useCallback(() => typewriterRef.current, []);
  const editableRef = useRef(false);
  const isEditable = useCallback(() => editableRef.current, []);
  const [editorState, setEditorState] = useState<EditorState | null>(null);

  // isTypewriterOn reads a ref and never changes, so mount and load need no dependencies.
  const mount = useCallback((element: HTMLDivElement | null) => {
    viewRef.current?.destroy();
    viewRef.current = element
      ? createView(element, isTypewriterOn, isEditable, (state, docChanged) => {
          setEditorState(state);
          if (docChanged) onDocChangeRef.current(state.doc);
        })
      : null;
    setEditorState(viewRef.current?.state ?? null);
  }, []);
  const load = useCallback((doc: Node) => {
    viewRef.current?.updateState(createEditorState(doc, isTypewriterOn));
    setEditorState(viewRef.current?.state ?? null);
  }, []);

  const run = useCallback((command: Command, shouldFocus = true) => {
    const view = viewRef.current;
    if (view && command(view.state, view.dispatch, view) && shouldFocus) view.focus();
  }, []);

  return { mount, load, run, editorState, viewRef, typewriterRef, editableRef };
}
