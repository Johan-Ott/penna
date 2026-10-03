import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export interface MenuItem {
  label: string;
  shortcut?: string;
  separatorBefore?: boolean;
  isChecked?: boolean;
  onSelect: () => void;
}

interface MenuProps {
  x: number;
  y: number;
  items: MenuItem[];
  label: string;
  onClose: () => void;
}

const EDGE = 8;

// Closes on a press outside the menu and when the window loses focus.
function useDismiss(onClose: () => void) {
  useEffect(() => {
    window.addEventListener("pointerdown", onClose);
    window.addEventListener("blur", onClose);
    return () => {
      window.removeEventListener("pointerdown", onClose);
      window.removeEventListener("blur", onClose);
    };
  }, [onClose]);
}

// Keeps the menu inside the window, flipping it up or left near an edge.
function useFittedPosition(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });
  useLayoutEffect(() => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    const left = Math.max(EDGE, Math.min(x, window.innerWidth - box.width - EDGE));
    const top = y + box.height > window.innerHeight - EDGE ? Math.max(EDGE, y - box.height) : y;
    setPosition({ left, top });
  }, [x, y]);
  return { ref, position };
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>, onClose: () => void) {
  const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[role^=menuitem]"));
  const index = items.indexOf(document.activeElement as HTMLElement);
  const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
  if (event.key === "Escape") onClose();
  if (step === undefined && event.key !== "Escape") return;
  event.preventDefault();
  if (step !== undefined) items[(index + step + items.length) % items.length]?.focus();
}

/** One menu for the whole app: right-click, the add button and the style picker. */
export function Menu({ x, y, items, label, onClose }: MenuProps) {
  useDismiss(onClose);
  const { ref, position } = useFittedPosition(x, y);
  const hasChecks = items.some((item) => item.isChecked !== undefined);
  return createPortal(
    <div
      ref={ref}
      className="menu"
      role="menu"
      aria-label={label}
      style={position}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => moveFocus(event, onClose)}
    >
      {items.map((item, index) => (
        <MenuRow
          key={item.label}
          item={item}
          hasChecks={hasChecks}
          isFirst={index === 0}
          onClose={onClose}
        />
      ))}
    </div>,
    document.body,
  );
}

function MenuRow(props: {
  item: MenuItem;
  hasChecks: boolean;
  isFirst: boolean;
  onClose: () => void;
}) {
  const { item } = props;
  return (
    <>
      {item.separatorBefore && <div className="menu-separator" role="separator" />}
      <button
        role={props.hasChecks ? "menuitemradio" : "menuitem"}
        aria-checked={props.hasChecks ? item.isChecked === true : undefined}
        autoFocus={item.isChecked ?? props.isFirst}
        onClick={() => {
          props.onClose();
          item.onSelect();
        }}
      >
        {props.hasChecks && <span className="menu-check">{item.isChecked ? "✓" : ""}</span>}
        <span className="menu-label">{item.label}</span>
        {item.shortcut && <kbd>{item.shortcut}</kbd>}
      </button>
    </>
  );
}
