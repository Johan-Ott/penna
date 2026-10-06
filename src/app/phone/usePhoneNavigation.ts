import { useCallback, useEffect, useState } from "react";

export type PhoneScreen =
  | { kind: "book" }
  | { kind: "text"; sceneId: string }
  | { kind: "sort"; sortId: string }
  | { kind: "sync" };

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
  }, []);
  const back = useCallback(() => window.history.back(), []);
  return { screen: stack[stack.length - 1] ?? { kind: "book" }, show, back };
}
