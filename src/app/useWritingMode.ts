import { useCallback, useState } from "react";
import { useSettingsDialog } from "./settings/SettingsDialog.js";
import { useGoKeys, useShortcut } from "./useShortcut.js";
import { useWritingSettings } from "./useWritingSettings.js";
import { t } from "../i18n/i18n.js";

/** Skriv: the open text. Innehåll: the book. Läs: a chapter or the whole book. Publicera: the export. */
export type View = "skriv" | "innehall" | "las" | "publicera";
export const VIEWS: [View, string, string][] = [
  ["skriv", t("Skriv"), "G S"],
  ["innehall", t("Innehåll"), "G I"],
  ["publicera", t("Publicera"), "G P"],
];

function useSearchMode() {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchSeed, setSearchSeed] = useState("");
  const openSearchWith = useCallback((text: string) => {
    setSearchSeed(text);
    setSearchOpen(true);
  }, []);
  return { isSearchOpen, setSearchOpen, searchSeed, openSearchWith };
}

// Null when the open text has no review.
function useReviewState() {
  const [isReviewOpen, setReviewOpen] = useState(false);
  const [reviewCount, setReviewCount] = useState<number | null>(null);
  const review = { isOpen: isReviewOpen, count: reviewCount };
  return { review, isReviewOpen, setReviewOpen, setReviewCount };
}

function useReading(setView: (view: View) => void) {
  const [readChapterId, setReadChapterId] = useState<string | null>(null);
  const read = useCallback(
    (chapterId: string | null) => {
      setReadChapterId(chapterId);
      setView("las");
    },
    [setView],
  );
  return { readChapterId, read };
}

// Under this width the sidebar floats over the card.
const NARROW = 960;

// In a narrow window the sidebar starts hidden.
function useSidebar() {
  const [isSidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= NARROW);
  const toggleSidebar = useCallback(() => setSidebarOpen((current) => !current), []);
  useShortcut(".", toggleSidebar);
  useShortcut("\\", toggleSidebar);
  return { isSidebarOpen, setSidebarOpen, toggleSidebar };
}

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
    ...useReading(setView),
    ...useReviewState(),
    ...useSearchMode(),
    ...useSidebar(),
  };
}
