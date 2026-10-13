import {
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { browserStorage } from "../browserStorage.js";
import { CloseButton } from "../controls.js";
import { GripIcon } from "../shell/icons.js";

// A block opened from the dock floats over the text, dragged by its head to where the writer
// wants it; the place is kept for the next time.

type Place = { left: number; top: number };

const placeKey = (id: string) => `penna.block.${id}`;

function readPlace(id: string): Place | null {
  try {
    const stored = browserStorage().getItem(placeKey(id));
    return stored ? (JSON.parse(stored) as Place) : null;
  } catch {
    return null;
  }
}

// Kept inside the card, so a block never ends up where it cannot be reached.
function clamped(panel: HTMLElement, wanted: Place): Place {
  const room = panel.offsetParent?.getBoundingClientRect();
  if (!room) return wanted;
  return {
    left: Math.min(Math.max(0, wanted.left), room.width - panel.offsetWidth),
    top: Math.min(Math.max(0, wanted.top), room.height - panel.offsetHeight),
  };
}

// The window follows the pointer until it lets go, wherever it goes meanwhile.
function useDrag(id: string) {
  const [place, setPlace] = useState(() => readPlace(id));
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const grab = { x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop };
    let last: Place | null = null;
    const move = (moved: globalThis.PointerEvent) => {
      last = clamped(panel, { left: moved.clientX - grab.x, top: moved.clientY - grab.y });
      setPlace(last);
    };
    const drop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      if (last) browserStorage().setItem(placeKey(id), JSON.stringify(last));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
  };
  return { place, setPlace, onPointerDown };
}

// A place kept from a larger window is moved inside this one, on opening and when it resizes.
function useKeptInside(
  panel: RefObject<HTMLElement | null>,
  place: Place | null,
  set: (place: Place) => void,
) {
  useLayoutEffect(() => {
    const fit = () => {
      if (!panel.current || !place) return;
      const inside = clamped(panel.current, place);
      if (inside.left !== place.left || inside.top !== place.top) set(inside);
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [panel, place, set]);
}

/** Without a kept place it opens above the dock, at the card's foot on the right. */
export function BlockPanel(props: {
  id: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { place, setPlace, onPointerDown } = useDrag(props.id);
  const panel = useRef<HTMLElement>(null);
  useKeptInside(panel, place, setPlace);
  return (
    <section
      ref={panel}
      className="block-panel"
      aria-label={props.title}
      style={place ?? undefined}
    >
      <header className="block-head" onPointerDown={onPointerDown}>
        <span className="block-title">
          <GripIcon />
          {props.title}
        </span>
        <CloseButton onClose={props.onClose} />
      </header>
      {props.children}
    </section>
  );
}
