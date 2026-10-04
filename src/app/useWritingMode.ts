import { useCallback, useState } from "react";
import { useSettingsDialog } from "./settings/SettingsDialog.js";
import { VIEWS, type View } from "./Sidebar.js";
import { useGoKeys, useShortcut } from "./useShortcut.js";
import { useWritingSettings } from "./useWritingSettings.js";

/** How the writer is working right now: view, focus mode, search, settings and the sidebar. */
export function useWritingMode() {
  const { settings, update } = useWritingSettings();
  const [isFocusMode, setFocusMode] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const onToggleFocus = useCallback(() => setFocusMode((current) => !current), []);
  const settingsDialog = useSettingsDialog();
  const [view, setView] = useState<View>("skriv");
  // In a narrow window the sidebar is folded away; Ctrl+. shows it over the text.
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  useShortcut(".", () => setSidebarOpen((current) => !current));
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
    isSearchOpen,
    setSearchOpen,
    isSidebarOpen,
    setSidebarOpen,
  };
}
