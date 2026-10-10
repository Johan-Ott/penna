import type { Node } from "prosemirror-model";
import type { Command, EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { useCallback, useRef, useState } from "react";
import { manuscriptSchema as schema } from "../manuscript/schema.js";
import { createEditorState, type EditorSwitches } from "./editorState.js";
import type { MentionMatcher } from "./mentions.js";
import type { CommentAnchor } from "./commentMarks.js";
import { pictureNodeView, type PictureUrl } from "./pictureView.js";
import type { RevisionChange } from "../manuscript/revision.js";
import type { SpellingSwitch } from "./spellingMarks.js";

function createView(
  element: HTMLElement,
  switches: ViewSwitches,
  onState: (state: EditorState, docChanged: boolean) => void,
) {
  const view: EditorView = new EditorView(element, {
    state: createEditorState(schema.node("doc"), switches),
    editable: switches.isEditable,
    // Penna's own check, where there is one, instead of the browser's.
    attributes: () => ({
      spellcheck: switches.isSpellcheckOn() && !switches.spelling() ? "true" : "false",
    }),
    nodeViews: { picture: pictureNodeView((name) => switches.pictureUrl(name)) },
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
  pictureUrl: PictureUrl;
}

interface EditorModes {
  isTypewriterOn: boolean;
  isTypographyOn: boolean;
  isAutocorrectOn: boolean;
  isSpellcheckOn: boolean;
  isEditable: boolean;
  mentionMatchers: MentionMatcher[];
  onMention: (id: string, box: DOMRect) => void;
  repeatWindow: number | null;
  pageMarks: (number | undefined)[] | null;
  commentAnchors: CommentAnchor[];
  onComment: (id: string) => void;
  /** Reads a picture in the open book's bilder/ folder. */
  pictureUrl: PictureUrl;
  revisionChanges: RevisionChange[];
  spelling: SpellingSwitch | null;
}

const START_MODES: EditorModes = {
  isTypewriterOn: false,
  isTypographyOn: true,
  isAutocorrectOn: false,
  isSpellcheckOn: true,
  isEditable: false,
  mentionMatchers: [],
  onMention: () => undefined,
  repeatWindow: null,
  pageMarks: null,
  commentAnchors: [],
  onComment: () => undefined,
  pictureUrl: async () => null,
  revisionChanges: [],
  spelling: null,
};

// ProseMirror asks these on every update, so the app can switch them without a new state.
function useModeSwitches() {
  const modes = useRef<EditorModes>({ ...START_MODES });
  const [switches] = useState<ViewSwitches>(() => ({
    isTypewriterOn: () => modes.current.isTypewriterOn,
    isTypographyOn: () => modes.current.isTypographyOn,
    isAutocorrectOn: () => modes.current.isAutocorrectOn,
    isSpellcheckOn: () => modes.current.isSpellcheckOn,
    isEditable: () => modes.current.isEditable,
    mentionMatchers: () => modes.current.mentionMatchers,
    onMention: (id, box) => modes.current.onMention(id, box),
    repeatWindow: () => modes.current.repeatWindow,
    pageMarks: () => modes.current.pageMarks,
    commentAnchors: () => modes.current.commentAnchors,
    onComment: (id) => modes.current.onComment(id),
    pictureUrl: (name) => modes.current.pictureUrl(name),
    revisionChanges: () => modes.current.revisionChanges,
    spelling: () => modes.current.spelling,
  }));
  return { switches, modes };
}

// A hidden editor cannot take focus, so the request waits until it is shown.
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

/** React re-renders on every transaction through `editorState`. */
export function useEditorView(onDocChange: (doc: Node) => void) {
  const viewRef = useRef<EditorView | null>(null);
  const onDocChangeRef = useRef(onDocChange);
  onDocChangeRef.current = onDocChange;
  const { switches, modes } = useModeSwitches();
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
  return { mount, load, run, editorState, viewRef, modes, ...focus };
}
