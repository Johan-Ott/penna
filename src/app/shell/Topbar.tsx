import { SprintButton } from "../sprint/SprintBar.js";
import { LookButton } from "../settingsPanel.js";
import { RemoteBadge } from "../settings/RemoteControlRow.js";
import { WindowControls } from "./WindowControls.js";
import { DayProgress } from "./DayProgress.js";
import type { MouseEvent, ReactNode } from "react";
import type { Today } from "../useWritingStats.js";
import type { View } from "../useWritingMode.js";
import { t } from "../../i18n/i18n.js";
import {
  BackIcon,
  BookIcon,
  FocusIcon,
  ForwardIcon,
  MenuIcon,
  PenIcon,
  ReadIcon,
  ReviewIcon,
  SearchIcon,
  SidebarIcon,
} from "./icons.js";

export interface TopbarProps {
  view: View;
  /** Shown instead of the day's words, as in Publicera. */
  title: string | null;
  today: Today;
  navigation: { canGoBack: boolean; canGoForward: boolean; back: () => void; forward: () => void };
  onMenu: (event: MouseEvent<HTMLElement>) => void;
  onToggleSidebar: () => void;
  onView: (view: View) => void;
  onProgress: () => void;
  onSearch: () => void;
  onFocus: () => void;
  onRead: () => void;
  /** The writer's picture, after Skriv and Publicera. */
  profile: ReactNode;
}

function IconButton(props: {
  label: string;
  className?: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className={props.className ? `topbar-button ${props.className}` : "topbar-button"}
      aria-label={props.label}
      title={props.label}
      disabled={props.isDisabled}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

function ModeSwitch({ view, onView }: Pick<TopbarProps, "view" | "onView">) {
  const isPublishing = view === "publicera";
  const mode = (label: string, isOn: boolean, next: View, icon: ReactNode) => (
    <button
      role="tab"
      aria-selected={isOn}
      aria-label={label}
      title={label}
      className={isOn ? "mode chosen" : "mode"}
      onClick={() => onView(next)}
    >
      {icon}
    </button>
  );
  return (
    <div className="mode-switch" role="tablist" aria-label={t("Läge")}>
      {mode(t("Skriv"), !isPublishing, "skriv", <PenIcon />)}
      {mode(t("Publicera"), isPublishing, "publicera", <BookIcon />)}
    </div>
  );
}

export function ShelfTopbar(props: Pick<TopbarProps, "title" | "onMenu" | "profile">) {
  return (
    <header className="topbar" data-tauri-drag-region>
      <div className="topbar-start" data-tauri-drag-region>
        <IconButton label={t("Meny")} onClick={props.onMenu}>
          <MenuIcon />
        </IconButton>
        {props.profile}
      </div>
      <span className="topbar-title" data-tauri-drag-region>
        {props.title}
      </span>
      <div className="topbar-end" data-tauri-drag-region>
        <WindowControls />
      </div>
    </header>
  );
}

const History = ({ navigation }: Pick<TopbarProps, "navigation">) => (
  <span className="topbar-history">
    <IconButton label={t("Bakåt")} onClick={navigation.back} isDisabled={!navigation.canGoBack}>
      <BackIcon />
    </IconButton>
    <IconButton
      label={t("Framåt")}
      onClick={navigation.forward}
      isDisabled={!navigation.canGoForward}
    >
      <ForwardIcon />
    </IconButton>
  </span>
);

function TopbarStart(props: TopbarProps) {
  const { navigation } = props;
  return (
    <div className="topbar-start" data-tauri-drag-region>
      <IconButton label={t("Meny")} onClick={props.onMenu}>
        <MenuIcon />
      </IconButton>
      <IconButton
        label={t("Visa eller dölj sidomenyn")}
        className="sidebar-toggle"
        onClick={props.onToggleSidebar}
      >
        <SidebarIcon />
      </IconButton>
      <History navigation={navigation} />
      <ModeSwitch view={props.view} onView={props.onView} />
      {props.profile}
    </div>
  );
}

type ReviewProps = { review: { count: number | null; isOpen: boolean }; onReview: () => void };

export function ReviewButton({ review, onReview }: ReviewProps) {
  if (review.count === null) return null;
  return (
    <button
      className={review.isOpen ? "topbar-button chosen" : "topbar-button"}
      aria-label={t("Granska · {count}", { count: review.count })}
      aria-pressed={review.isOpen}
      title={t("Granska")}
      onClick={onReview}
    >
      <ReviewIcon />
      {review.count > 0 && <span className="topbar-badge">{review.count}</span>}
    </button>
  );
}

function TopbarEnd(props: TopbarProps) {
  return (
    <div className="topbar-end" data-tauri-drag-region>
      <RemoteBadge />
      {props.view === "skriv" && <LookButton />}
      <IconButton label={t("Läs som bok · Ctrl+R")} onClick={props.onRead}>
        <ReadIcon />
      </IconButton>
      <IconButton label={t("Sök · Ctrl+K")} onClick={props.onSearch}>
        <SearchIcon />
      </IconButton>
      <IconButton label={t("Fokusläge · Ctrl+Shift+F")} onClick={props.onFocus}>
        <FocusIcon />
      </IconButton>
      <WindowControls />
    </div>
  );
}

export function Topbar(props: TopbarProps) {
  return (
    <header className="topbar" data-tauri-drag-region>
      <TopbarStart {...props} />
      {props.title === null ? (
        <span className="topbar-day" data-tauri-drag-region>
          <DayProgress today={props.today} onProgress={props.onProgress} />
          <SprintButton />
        </span>
      ) : (
        <span className="topbar-title" data-tauri-drag-region>
          {props.title}
        </span>
      )}
      <TopbarEnd {...props} />
    </header>
  );
}

/** Granska floats at the foot of the text, with what it has found, as the design draws it. */
export function ReviewPill({ review, onReview }: ReviewProps) {
  if (review.count === null) return null;
  return (
    <button
      className={review.isOpen ? "review-pill open" : "review-pill"}
      aria-label={t("Granska · {count}", { count: review.count })}
      aria-pressed={review.isOpen}
      onClick={onReview}
    >
      {t("Granska")}
      {review.count > 0 && <span className="review-pill-count">{review.count}</span>}
    </button>
  );
}
