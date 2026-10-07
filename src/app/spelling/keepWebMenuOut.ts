import { platform } from "../platform.js";

/**
 * On a computer a right-click opens Penna's own menus, never the web view's with Emoji and Granska.
 * A plain text field keeps the system's, with paste; a phone keeps its own long-press menu.
 */
export function keepWebMenuOut() {
  if (platform.isPhone) return;
  document.addEventListener("contextmenu", (event) => {
    const field = event.target instanceof Element && event.target.closest("input, textarea");
    if (!field) event.preventDefault();
  });
}
