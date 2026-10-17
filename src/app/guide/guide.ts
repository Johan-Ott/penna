import { useSyncExternalStore } from "react";
import { browserStorage } from "@llkit/storage/browserStorage.js";
import { t } from "../../i18n/i18n.js";

// The guide for a new writer: one small tip in each part of Penna, the first time they come
// there. Seen tips stay seen per computer, and the whole guide can be skipped or started over.

export const STEPS = [
  {
    id: "skriv",
    name: t("Skriv"),
    text: t(
      "Skriv här. Penna sparar av sig själv. Kapitel och scener lägger du till i trädet till vänster.",
    ),
  },
  {
    id: "anteckningar",
    name: t("Anteckningar"),
    text: t(
      "En anteckning håller en person, en plats eller en sak. Namnet blir en länk i texten, så du hittar hit medan du skriver.",
    ),
  },
  {
    id: "planera",
    name: t("Planera"),
    text: t(
      "Innehåll visar boken kapitel för kapitel, med vad som händer och när. Här ser du hela berättelsen på en gång.",
    ),
  },
  {
    id: "granska",
    name: t("Granska"),
    text: t(
      "Granska samlar kommentarer och det texten kan behöva: upprepningar, filterord och stavning i kapitlet du skriver.",
    ),
  },
  {
    id: "publicera",
    name: t("Publicera"),
    text: t(
      "Välj utseende under Design, fyll i Bokuppgifter och exportera som manus, e-bok eller tryck-PDF.",
    ),
  },
] as const;

export type StepId = (typeof STEPS)[number]["id"];

interface GuideState {
  isOff: boolean;
  seen: StepId[];
}

const KEY = "penna.guide";
const listeners = new Set<() => void>();
// The tips on screen now; only the first of them in the guide's order shows.
const mounted = new Set<StepId>();

function stored(): GuideState {
  try {
    return { isOff: false, seen: [], ...JSON.parse(browserStorage().getItem(KEY) ?? "{}") };
  } catch {
    return { isOff: false, seen: [] };
  }
}

let state = stored();
let version = 0;

const changed = () => {
  version += 1;
  listeners.forEach((listener) => listener());
};

const save = (next: GuideState) => {
  state = next;
  browserStorage().setItem(KEY, JSON.stringify(next));
  changed();
};

export const markSeen = (id: StepId) => save({ ...state, seen: [...state.seen, id] });
export const skipGuide = () => save({ ...state, isOff: true });
export const restartGuide = () => save({ isOff: false, seen: [] });
export const isSeen = (id: StepId) => state.seen.includes(id);

/** Registers a tip as on screen, and gives back the call that takes it off again. */
export function mount(id: StepId) {
  mounted.add(id);
  changed();
  return () => {
    mounted.delete(id);
    changed();
  };
}

/** The one tip to show now, if the guide is on and any tip on screen is still unseen. */
const showing = () =>
  state.isOff ? undefined : STEPS.find(({ id }) => mounted.has(id) && !isSeen(id))?.id;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useGuide() {
  useSyncExternalStore(subscribe, () => version);
  return { showing: showing() };
}
