import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMenuButton } from "./Menu.js";
import { useEscape } from "./useShortcut.js";
import { t } from "../i18n/i18n.js";

// The app's own controls; use them instead of native ones so every choice looks the same.

export function Row(props: { label: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="settings-row">
      <span className="setting-text">
        <span>{props.label}</span>
        {props.hint && <span className="setting-hint">{props.hint}</span>}
      </span>
      <span className="settings-control">{props.children}</span>
    </div>
  );
}

export function Switch(props: { label: string; isOn: boolean; onFlip: () => void }) {
  return (
    <button
      type="button"
      className="toggle"
      role="switch"
      aria-checked={props.isOn}
      aria-label={props.label}
      onClick={props.onFlip}
    >
      <span />
    </button>
  );
}

export function Choice<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onSelect: (value: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map(([value, text]) => (
        <button
          type="button"
          key={value}
          role="radio"
          aria-checked={value === props.value}
          onClick={() => props.onSelect(value)}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

/** A button showing the current choice; it opens the app's menu with that choice checked. */
export function Dropdown<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onSelect: (value: T) => void;
}) {
  const items = props.options.map(([value, text]) => ({
    label: text,
    isChecked: value === props.value,
    onSelect: () => props.onSelect(value),
  }));
  const menu = useMenuButton(props.label, items);
  const current = props.options.find(([value]) => value === props.value)?.[1] ?? "";
  return (
    <>
      <button
        type="button"
        className="dropdown"
        aria-label={props.label}
        aria-haspopup="menu"
        onClick={menu.open}
      >
        {current}
      </button>
      {menu.menu}
    </>
  );
}

/** A modal dialog with a title; Escape or a click outside closes it. */
export function Dialog(props: {
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(props.onClose);
  // Drawn at the top of the page, so no panel it was opened from can cover it.
  return createPortal(
    <div className="dialog-backdrop" onClick={props.onClose}>
      <div
        className={`dialog ${props.className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        onClick={(event) => event.stopPropagation()}
      >
        <span className="dialog-title">{props.label}</span>
        {props.children}
      </div>
    </div>,
    document.body,
  );
}

/** The row at the bottom of a dialog: Avbryt, and the action that saves. */
export function DialogButtons(props: {
  label?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dialog-actions">
      <button className="button ghost" onClick={props.onCancel}>
        {t("Avbryt")}
      </button>
      <button className="button primary" onClick={props.onConfirm}>
        {props.label ?? t("Spara")}
      </button>
    </div>
  );
}
