import { useLayoutEffect } from "react";

/** A class on the page's root while the component is shown, for CSS that would otherwise ask
 * :has() of the whole document on every key typed. */
export function useRootClass(name: string, isOn = true) {
  useLayoutEffect(() => {
    if (!isOn) return;
    document.documentElement.classList.add(name);
    return () => document.documentElement.classList.remove(name);
  }, [name, isOn]);
}
