import { useCallback, useState } from "react";
import { useSettingsDialog } from "./settings/SettingsDialog.js";
import { useGoKeys, useShortcut } from "./useShortcut.js";
import { useWritingSettings } from "./useWritingSettings.js";
import { t } from "../i18n/i18n.js";

/** Skriv shows the open text (a scene or a note), Innehåll the book, Publicera the finished book. */
export type View = "skriv" | "innehall" | "publicera";
export const VIEWS: [View, string, string][] = [
  ["skriv", t("Skriv"), "G S"],
  ["innehall", t("Innehåll"), "G I"],
  ["publicera", t("Publicera"), "G P"],
];

// Find and replace is open or not; the palette can open it with a word already typed in.
function useSearchMode() {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const openSearchWith = useCallback((text: string) => {
    setSearchSeed(text);
    setSearchOpen(true);
  }, []);
  return { isSearchOpen, setSearchOpen, searchSeed, openSearchWith };
}

// Granska is opened from the top bar, which also shows how much there is to look at:
// null when the open text has no review.
function useReviewState() {
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const review = { isOpen: isReviewOpen, count: reviewCount };
  return { review, isReviewOpen, setReviewOpen, setReviewCount };
}

// The width under which the sidebar floats over the card instead of standing beside it.
const NARROW = 960;

// The sidebar is shown unless the writer hides it; in a narrow window it starts hidden.
function useSidebar() {
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= NARROW);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => !current), []);
  useShortcut(".", toggleSidebar);
  useShortcut("\\", toggleSidebar);
  return { isSidebarOpen, setSidebarOpen, toggleSidebar };
}

/** How the writer is working right now: view, focus mode, search, settings and the sidebar. */
export function useWritingMode() {
  const { settings, update } = useWritingSettings();
  const [isFocusMode, setFocusMode] = useState(false);
  const onToggleFocus = useCallback(() => setFocusMode((current) => !current), []);
  const settingsDialog = useSettingsDialog();
  const [view, setView] = useState<View>("skriv");
  const [isProgressOpen, setProgressOpen] = useState(false);
  useGoKeys((letter) => {
    const match = VIEWS.find(([, , keys]) => keys.toLowerCase().endsWith(letter));
    if (match) setView(match[0]);
    return match !== undefined;
  });
  return {
    view,
    setView,
    settingsDialog,
    settings,
    onChangeSettings: update,
    isFocusMode,
    onToggleFocus,
    isProgressOpen,
    setProgressOpen,
    ...useReviewState(),
    ...useSearchMode(),
    ...useSidebar(),
  };
}
