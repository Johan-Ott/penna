import type { EditorState } from "prosemirror-state";
import { useSyncExternalStore } from "react";

// Uppläsning: the computer's own voice reads the text back, a paragraph at a time, to proofread by
// ear. The phone's WebView has no voice, so there it is not offered.

let isSpeaking = false;
const listeners = new Set<() => void>();
const tell = (now: boolean) => {
  isSpeaking = now;
  listeners.forEach((listener) => listener());
};

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// The start of the top-level block the cursor is in, so reading begins at its paragraph.
const blockStart = (state: EditorState) => {
  const { $from } = state.selection;
  return $from.depth > 0 ? $from.before(1) : 0;
};

/** The selection, or from the cursor's paragraph to the end of the text. */
export function paragraphsToRead(state: EditorState): string[] {
  const { from, to, empty } = state.selection;
  const start = empty ? blockStart(state) : from;
  const end = empty ? state.doc.content.size : to;
  return state.doc
    .textBetween(start, end, "\n", " ")
    .split("\n")
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// A voice in the book's language, when the computer has one; otherwise the browser picks.
const voiceFor = (language: string) =>
  window.speechSynthesis
    .getVoices()
    .find((voice) => voice.lang.replace("_", "-").startsWith(language.slice(0, 2)));

export function speak(paragraphs: string[], language: string) {
  const synth = window.speechSynthesis;
  synth.cancel();
  const voice = voiceFor(language);
  paragraphs.forEach((text, index) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    if (voice) utterance.voice = voice;
    if (index === paragraphs.length - 1) utterance.onend = () => tell(false);
    utterance.onerror = () => tell(false);
    synth.speak(utterance);
  });
  tell(paragraphs.length > 0);
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
  tell(false);
}

export const useSpeaking = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => isSpeaking,
  );
