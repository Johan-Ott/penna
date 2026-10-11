import { useEffect, useState } from "react";
import { usePhone } from "../phone/usePhone.js";
import { CorrectionsBar, useCaretCorrections } from "./Corrections.js";

type Editor = Parameters<typeof CorrectionsBar>[0]["editor"];

// Only a click into the word asks for its corrections; typing it out does not.
function useClicked(editor: Editor) {
  const [isClicked, setClicked] = useState(false);
  const element = editor.viewRef.current?.dom;
  useEffect(() => {
    if (!element) return;
    const onPointer = () => setClicked(true);
    const onKey = () => setClicked(false);
    element.addEventListener("pointerup", onPointer);
    element.addEventListener("keydown", onKey);
    return () => {
      element.removeEventListener("pointerup", onPointer);
      element.removeEventListener("keydown", onKey);
    };
  }, [element]);
  return isClicked;
}

/** On the computer: a click on an underlined word shows its corrections just under it. */
export function ClickCorrections({ editor }: { editor: Editor }) {
  const isPhone = usePhone();
  const isClicked = useClicked(editor);
  const corrections = useCaretCorrections(editor);
  const view = editor.viewRef.current;
  if (isPhone || !isClicked || !corrections || !view) return null;
  const place = view.coordsAtPos(corrections.from);
  return (
    <div
      className="click-corrections"
      style={{ left: place.left, top: place.bottom + 6 }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <CorrectionsBar editor={editor} corrections={corrections} />
    </div>
  );
}
