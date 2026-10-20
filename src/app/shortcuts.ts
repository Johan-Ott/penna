import { useSyncExternalStore } from "react";
import { useShortcut } from "@llkit/keys.js";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { MODIFIER_NAME, shortcutText, type Binding } from "@llkit/shortcutKeys.js";
import { t } from "../i18n/i18n.js";

export { MODIFIER_NAME, shortcutText, type Binding };

// The shortcuts a writer can change, with what they are from the start. A change is kept per
// computer and only says how the command differs from its default.

export const COMMANDS = {
  palette: { label: t("Kommandopalett"), key: "k" },
  search: { label: t("Sök och ersätt"), key: "f" },
  focus: { label: t("Fokusläge"), key: "f", shift: true },
  newScene: { label: t("Ny scen"), key: "n" },
  splitScene: { label: t("Dela scenen vid markören"), key: "enter", shift: true },
  comment: { label: t("Kommentera markeringen"), key: "m", shift: true },
  readAloud: { label: t("Läs upp från markören"), key: "u", shift: true },
  read: { label: t("Läs hela boken"), key: "r" },
  shelf: { label: t("Bokhylla"), key: "o", shift: true },
  newBook: { label: t("Ny bok"), key: "n", shift: true },
  settings: { label: t("Inställningar"), key: "," },
  sidebar: { label: t("Visa sidomenyn i ett smalt fönster"), key: "." },
} satisfies Record<string, Binding & { label: string }>;

export type CommandId = keyof typeof COMMANDS;

const KEY = "skrivro.kortkommandon";
const listeners = new Set<() => void>();

function changes(): Partial<Record<CommandId, Binding>> {
  try {
    return JSON.parse(browserStorage().getItem(KEY) ?? "{}") as Partial<Record<CommandId, Binding>>;
  } catch {
    return {};
  }
}

let current = changes();

export const bindingOf = (id: CommandId): Binding => current[id] ?? COMMANDS[id];

const save = (next: typeof current) => {
  current = next;
  browserStorage().setItem(KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
};

export const rebind = (id: CommandId, binding: Binding) => save({ ...current, [id]: binding });
export const resetBindings = () => save({});

const sameKeys = (one: Binding, other: Binding) =>
  one.key === other.key && !!one.shift === !!other.shift && !!one.alt === !!other.alt;

/** The other command already on these keys, if any. */
export const takenBy = (id: CommandId, binding: Binding) =>
  (Object.keys(COMMANDS) as CommandId[]).find(
    (other) => other !== id && sameKeys(bindingOf(other), binding),
  );

export const shortcutOf = (id: CommandId) => shortcutText(bindingOf(id));

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useBinding = (id: CommandId) => useSyncExternalStore(subscribe, () => bindingOf(id));

/** A command's shortcut, on the keys the writer chose for it in Kortkommandon. */
export function useCommandKey(id: CommandId, action: () => void) {
  const binding = useBinding(id);
  useShortcut(binding.key, action, binding);
}
