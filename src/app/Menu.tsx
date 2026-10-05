import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
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

// A choice menu opens on the current choice; other menus on their first item.
function focusIndexOf(items: MenuItem[]) {
  const isChoiceMenu = items.every((item) => item.isChecked !== undefined);
  return isChoiceMenu
    ? Math.max(
        0,
        items.findIndex((item) => item.isChecked),
      )
    : 0;
}

/** The one menu used for right-click, the add button and the style picker. */
export function Menu({ x, y, items, label, onClose }: MenuProps) {
  useDismiss(onClose);
  const { ref, position } = useFittedPosition(x, y);
  const hasChecks = items.some((item) => item.isChecked !== undefined);
  const focusIndex = focusIndexOf(items);
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
          isFocused={index === focusIndex}
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
  isFocused: boolean;
  onClose: () => void;
}) {
  const { item } = props;
  return (
    <>
      {item.separatorBefore && <div className="menu-separator" role="separator" />}
      <button
        role={item.isChecked === undefined ? "menuitem" : "menuitemradio"}
        aria-checked={item.isChecked}
        autoFocus={props.isFocused}
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

export function useMenuButton(label: string, items: MenuItem[]) {
  const [place, setPlace] = useState<{ x: number; y: number } | null>(null);
  const open = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
    const box = event.currentTarget.getBoundingClientRect();
    setPlace({ x: box.left, y: box.bottom + 4 });
  };
  const menu = place && (
    <Menu {...place} label={label} items={items} onClose={() => setPlace(null)} />
  );
  return { open, menu };
}
