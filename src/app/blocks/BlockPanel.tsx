import { useLayoutEffect, useRef, type PointerEvent, type ReactNode, type RefObject } from "react";
import { CloseButton } from "@llkit/controls.js";
import { createStore } from "@llkit/store.js";
import { usePhone } from "../phone/usePhone.js";
import { GripIcon, Icon } from "../shell/icons.js";
import { t } from "../../i18n/i18n.js";
import { keepPlaces, places, setPlace, type Place } from "./layout.js";

// A block opened from the dock floats over the text, dragged by its head to where the writer
// wants it; the place is kept for the next time, and in the layouts.

// Kept inside the card, so a block never ends up where it cannot be reached.
function clamped(panel: HTMLElement, wanted: Place): Place {
  // A fixed panel has no offset parent: the window is its room.
  const room = panel.offsetParent?.getBoundingClientRect() ?? {
    width: window.innerWidth,
    height: window.innerHeight,
  };
  return {
    left: Math.min(Math.max(0, wanted.left), room.width - panel.offsetWidth),
    top: Math.min(Math.max(0, wanted.top), room.height - panel.offsetHeight),
  };
}

// The window follows the pointer until it lets go, wherever it goes meanwhile.
function useDrag(id: string) {
  const place = places.use()[id] ?? null;
  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    const panel = event.currentTarget.parentElement;
    if (!panel || (event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const grab = { x: event.clientX - panel.offsetLeft, y: event.clientY - panel.offsetTop };
    let last: Place | null = null;
    const move = (moved: globalThis.PointerEvent) => {
      last = clamped(panel, { left: moved.clientX - grab.x, top: moved.clientY - grab.y });
      setPlace(id, last);
    };
    const drop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      if (last) keepPlaces();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
  };
  return { place, onPointerDown };
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

// The panels drawn down to their head, by id; kept per device, as their places are.
const MINIMIZED_KEY = "skrivro.minimized";

function storedMinimized(): string[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(MINIMIZED_KEY) ?? "[]");
    return Array.isArray(stored) ? stored.map(String) : [];
  } catch {
    return [];
  }
}

const minimized = createStore<string[]>(storedMinimized());

function toggleMinimized(id: string) {
  const now = minimized.get();
  const next = now.includes(id) ? now.filter((other) => other !== id) : [...now, id];
  minimized.set(next);
  try {
    localStorage.setItem(MINIMIZED_KEY, JSON.stringify(next));
  } catch {
    // Without storage the panel stays drawn down until Skrivro closes.
  }
}

/** A panel moved by its head and kept where it was left, and drawn down to its head when the
 * writer wants; `isOn` false leaves it to the CSS, as on a phone, where panels cover the screen. */
export function useFloating(id: string, isOn = true) {
  const { place, onPointerDown } = useDrag(id);
  const ref = useRef<HTMLElement>(null);
  const isMinimized = minimized.use().includes(id) && isOn;
  useKeptInside(ref, isOn ? place : null, (inside) => setPlace(id, inside));
  return {
    ref,
    style: isOn && place ? place : undefined,
    onPointerDown: isOn ? onPointerDown : undefined,
    minimized: isMinimized ? " minimized" : "",
  };
}

const MinimizeIcon = () => (
  <Icon size={14}>
    <path d="M6 12h12" />
  </Icon>
);

const RestoreIcon = () => (
  <Icon size={14}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Icon>
);

/** The head's buttons: Minimera, which leaves only the head, and close. */
export function HeadButtons(props: {
  id: string;
  closeLabel?: string;
  isPhoneBack?: boolean;
  onClose: () => void;
}) {
  const isMinimized = minimized.use().includes(props.id);
  const label = isMinimized ? t("Visa hela panelen") : t("Minimera");
  return (
    <span className="block-head-buttons">
      <button
        className="block-minimize"
        aria-label={label}
        title={label}
        aria-expanded={!isMinimized}
        onClick={() => toggleMinimized(props.id)}
      >
        {isMinimized ? <RestoreIcon /> : <MinimizeIcon />}
      </button>
      <CloseButton
        label={props.closeLabel}
        isPhoneBack={props.isPhoneBack}
        onClose={props.onClose}
      />
    </span>
  );
}

/** Without a kept place it opens above the dock, at the card's foot on the right. */
export function BlockPanel(props: {
  id: string;
  title: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { ref, style, onPointerDown, minimized } = useFloating(props.id, !usePhone());
  return (
    <section
      ref={ref}
      className={(props.className ? `block-panel ${props.className}` : "block-panel") + minimized}
      aria-label={props.title}
      style={style}
    >
      <header className="block-head" onPointerDown={onPointerDown}>
        <span className="block-title">
          <GripIcon />
          {props.title}
        </span>
        <HeadButtons id={props.id} isPhoneBack onClose={props.onClose} />
      </header>
      {props.children}
    </section>
  );
}
