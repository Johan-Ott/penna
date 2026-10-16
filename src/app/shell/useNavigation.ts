import { useEffect, useRef, useState } from "react";
import type { View } from "../useWritingMode.js";

export interface Place {
  view: View;
  sceneId: string | null;
}

const ARRIVAL_MS = 2000;

const samePlace = (first: Place | undefined, second: Place) =>
  first?.view === second.view && first.sceneId === second.sceneId;

/** Going back only moves the pointer, so landing on a place adds nothing new to the history. */
export function useNavigation(current: Place, goTo: (place: Place) => void) {
  const [places, setPlaces] = useState<Place[]>([current]);
  const [index, setIndex] = useState(0);
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  // A scene opens a moment after its view shows; places passed on the way are not remembered.
  const arriving = useRef<{ place: Place; until: number } | null>(null);
  useEffect(() => {
    const target = arriving.current;
    if (target && Date.now() < target.until && !samePlace(target.place, current)) return;
    arriving.current = null;
    if (samePlace(places[index], current)) return;
    setPlaces([...places.slice(0, index + 1), current]);
    setIndex(index + 1);
  }, [current, places, index]);
  const step = (direction: 1 | -1) => {
    const place = places[index + direction];
    if (!place) return;
    setIndex(index + direction);
    arriving.current = { place, until: Date.now() + ARRIVAL_MS };
    goToRef.current(place);
  };
  useMouseSideButtons(step);
  return {
    canGoBack: index > 0,
    canGoForward: index < places.length - 1,
    back: () => step(-1),
    forward: () => step(1),
  };
}

// A mouse's side buttons step back and forward as the arrows do, instead of the web view's own
// history, which has nothing to go back to.
function useMouseSideButtons(step: (direction: 1 | -1) => void) {
  const stepRef = useRef(step);
  stepRef.current = step;
  useEffect(() => {
    const onButton = (event: MouseEvent) => {
      if (event.button !== 3 && event.button !== 4) return;
      event.preventDefault();
      if (event.type === "mouseup") stepRef.current(event.button === 3 ? -1 : 1);
    };
    window.addEventListener("mousedown", onButton);
    window.addEventListener("mouseup", onButton);
    return () => {
      window.removeEventListener("mousedown", onButton);
      window.removeEventListener("mouseup", onButton);
    };
  }, []);
}
