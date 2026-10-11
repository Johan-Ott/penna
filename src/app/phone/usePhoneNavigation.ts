import { useCallback, useEffect, useState } from "react";

export type PhoneScreen =
  | { kind: "book" }
  | { kind: "text"; sceneId: string }
  | { kind: "sort"; sortId: string }
  /** Innehåll, Läs, Publicera or Från synken, as the writing mode's view says. */
  | { kind: "view" };

// A screen opened anew starts at its top; going back keeps the place it was left at.
function toTop() {
  window.scrollTo(0, 0);
  document.querySelectorAll(".phone-app .page, .phone-view").forEach((scroller) => {
    scroller.scrollTop = 0;
  });
}

// What Android's back button closes before it leaves a screen: a menu, a dialog or a panel.
const LAYERS = "[role=menu], [role=dialog], .insights-panel, .review-panel.open";
const openLayers = () => document.querySelectorAll(LAYERS).length;

/** Android's back: closes what lies on top, else the screen before; false when there is none. */
function pennaBack(depth: number) {
  const layers = openLayers();
  if (layers === 0) {
    if (depth <= 1) return false;
    window.history.back();
    return true;
  }
  const target = document.activeElement ?? document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  // A layer that does not close with Escape still lets back leave the screen.
  setTimeout(() => openLayers() >= layers && depth > 1 && window.history.back(), 80);
  return true;
}

/** Each screen is a history entry, so Android's back button returns to the screen before. */
export function usePhoneNavigation() {
  const [stack, setStack] = useState<PhoneScreen[]>([{ kind: "book" }]);
  useEffect(() => {
    const onBack = () =>
      setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
    window.addEventListener("popstate", onBack);
    return () => window.removeEventListener("popstate", onBack);
  }, []);
  const show = useCallback((screen: PhoneScreen) => {
    window.history.pushState({ penna: screen.kind }, "");
    setStack((current) => [...current, screen]);
    requestAnimationFrame(toTop);
  }, []);
  const back = useCallback(() => window.history.back(), []);
  useEffect(() => {
    const depth = stack.length;
    const page = window as { pennaBack?: () => boolean };
    page.pennaBack = () => pennaBack(depth);
    return () => void delete page.pennaBack;
  }, [stack.length]);
  return { screen: stack[stack.length - 1] ?? { kind: "book" }, show, back };
}
