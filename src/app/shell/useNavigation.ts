import { useEffect, useRef, useState } from "react";
import type { View } from "../useWritingMode.js";

/** Where the writer has been: a view, and the text that was open in it. */
export interface Place {
  view: View;
  sceneId: string | null;
}

const ARRIVAL_MS = 2000;

const samePlace = (first: Place | undefined, second: Place) =>
  first?.view === second.view && first.sceneId === second.sceneId;

/**
 * Bakåt and Framåt in the top bar. Every new place is remembered; going back only moves the
 * pointer, so the place it lands on is already the current one and nothing new is added.
 */
export function useNavigation(current: Place, goTo: (place: Place) => void) {
  const [places, setPlaces] = useState<Place[]>([current]);
  const [index, setIndex] = useState(0);
  const goToRef = useRef(goTo);
  goToRef.current = goTo;
  // A scene opens a moment after its view shows; the places on the way are not remembered.
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
  return {
    canGoBack: index > 0,
    canGoForward: index < places.length - 1,
    back: () => step(-1),
    forward: () => step(1),
  };
}
