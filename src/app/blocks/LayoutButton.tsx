import type { AppState } from "../App.js";
import { useMenuButton, type MenuItem } from "@llkit/Menu.js";
import { LayoutIcon } from "../shell/icons.js";
import { setPanelOpen, useSprint } from "../sprint/sprint.js";
import {
  activeLayout,
  applyLayoutPlaces,
  LAYOUT_SLOTS,
  layouts,
  openBlocks,
  saveLayout,
  type Layout,
} from "./layout.js";
import { t } from "../../i18n/i18n.js";

// A layout holds which panels are open, Granska, Insikter and the sprint's among them, and where
// each lies; choosing one opens and closes them to match.

const GRANSKA = "granska";
const INSIKTER = "insikter";
const SPRINT = "sprint";

function openNow(app: AppState, isSprintOpen: boolean) {
  const { isReviewOpen, isProgressOpen } = app.writingMode;
  return [
    ...openBlocks.get(),
    ...(isReviewOpen ? [GRANSKA] : []),
    ...(isProgressOpen ? [INSIKTER] : []),
    ...(isSprintOpen ? [SPRINT] : []),
  ];
}

function apply(app: AppState, slot: number, layout: Layout) {
  applyLayoutPlaces(layout);
  activeLayout.set(slot);
  const isOpen = (id: string) => layout.open.includes(id);
  openBlocks.set(layout.open.filter((id) => ![GRANSKA, INSIKTER, SPRINT].includes(id)));
  app.writingMode.setReviewOpen(isOpen(GRANSKA));
  app.writingMode.setProgressOpen(isOpen(INSIKTER));
  setPanelOpen(isOpen(SPRINT));
}

const name = (slot: number) => t("Layout {slot}", { slot });

// The saved layouts to choose, then a row to save in each place.
function layoutItems(app: AppState, saved: Record<number, Layout>, isSprintOpen: boolean) {
  const choices: MenuItem[] = LAYOUT_SLOTS.filter((slot) => saved[slot]).map((slot) => ({
    label: name(slot),
    isChecked: activeLayout.get() === slot,
    onSelect: () => apply(app, slot, saved[slot] as Layout),
  }));
  const saving: MenuItem[] = LAYOUT_SLOTS.map((slot, index) => ({
    label: t("Spara som layout {slot}", { slot }),
    separatorBefore: index === 0 && choices.length > 0,
    onSelect: () => saveLayout(slot, openNow(app, isSprintOpen)),
  }));
  return [...choices, ...saving];
}

export function LayoutButton({ app }: { app: AppState }) {
  const { isPanelOpen } = useSprint();
  const active = activeLayout.use();
  const menu = useMenuButton(t("Layouter"), layoutItems(app, layouts.use(), isPanelOpen));
  return (
    <>
      <button
        className="dock-button review-dock"
        aria-label={active ? t("Layouter · {name}", { name: name(active) }) : t("Layouter")}
        title={t("Layouter")}
        onClick={menu.open}
      >
        <LayoutIcon />
        {active && <span className="dock-badge quiet">{active}</span>}
      </button>
      {menu.menu}
    </>
  );
}
