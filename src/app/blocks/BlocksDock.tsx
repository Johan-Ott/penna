import type { ReactNode } from "react";
import { SprintButton } from "../sprint/SprintBar.js";

// The blocks as icons at the text's foot on the right, before Granska; each opens as a panel
// that can be moved, and closing it makes it an icon again.

export function BlocksDock({ review }: { review: ReactNode }) {
  return (
    <div className="blocks-dock">
      <SprintButton look="dock-button" />
      {review}
    </div>
  );
}
