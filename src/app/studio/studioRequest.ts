import { useSyncExternalStore } from "react";
import type { ImageCardId } from "./studioDraw.js";

// A celebration's Dela asks for a card in Studio; Publicera opens on it and then forgets it.
let wanted: ImageCardId | null = null;
const listeners = new Set<() => void>();
const tell = () => listeners.forEach((listener) => listener());

export const requestStudio = (card: ImageCardId) => ((wanted = card), tell());
export const takeStudioRequest = () => {
  const card = wanted;
  wanted = null;
  return card;
};

export function useStudioRequest() {
  return useSyncExternalStore(
    (listener) => (listeners.add(listener), () => listeners.delete(listener)),
    () => wanted,
  );
}
