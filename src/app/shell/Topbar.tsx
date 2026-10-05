import type { MouseEvent, ReactNode } from "react";
import type { Today } from "../useWritingStats.js";
import type { View } from "../useWritingMode.js";
import { numberLocale, t } from "../../i18n/i18n.js";
import {
  BackIcon,
  BookIcon,
  FocusIcon,
  ForwardIcon,
  MenuIcon,
  PenIcon,
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
  review: { count: number | null; isOpen: boolean };
  onReview: () => void;
}

function IconButton(props: {
  label: string;
  onClick: (event: MouseEvent<HTMLElement>) => void;
  isDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      className="topbar-button"
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

function DayProgress({ today, onProgress }: { today: Today; onProgress: () => void }) {
  const format = (words: number) => words.toLocaleString(numberLocale());
  const share = today.goal ? Math.min(100, (100 * today.words) / today.goal) : null;
  return (
    <button className="day-progress" aria-label={t("Framsteg idag")} onClick={onProgress}>
      <span>
        {today.goal
          ? t("{words} / {goal} ord", { words: format(today.words), goal: format(today.goal) })
          : t("{count} ord idag", { count: format(today.words) })}
      </span>
      {share !== null && (
        <span className="day-progress-bar">
          <span style={{ width: `${share}%` }} />
        </span>
      )}
    </button>
  );
}

export function ShelfTopbar(props: Pick<TopbarProps, "title" | "onMenu">) {
  return (
    <header className="topbar">
      <div className="topbar-start">
        <IconButton label={t("Meny")} onClick={props.onMenu}>
          <MenuIcon />
        </IconButton>
      </div>
      <span className="topbar-title">{props.title}</span>
    </header>
  );
}

function TopbarStart(props: TopbarProps) {
  const { navigation } = props;
  return (
    <div className="topbar-start">
      <IconButton label={t("Meny")} onClick={props.onMenu}>
        <MenuIcon />
      </IconButton>
      <IconButton label={t("Visa eller dölj sidomenyn")} onClick={props.onToggleSidebar}>
        <SidebarIcon />
      </IconButton>
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
      <ModeSwitch view={props.view} onView={props.onView} />
    </div>
  );
}

export function ReviewButton({ review, onReview }: Pick<TopbarProps, "review" | "onReview">) {
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

export function Topbar(props: TopbarProps) {
  return (
    <header className="topbar">
      <TopbarStart {...props} />
      {props.title === null ? (
        <DayProgress today={props.today} onProgress={props.onProgress} />
      ) : (
        <span className="topbar-title">{props.title}</span>
      )}
      <div className="topbar-end">
        <ReviewButton review={props.review} onReview={props.onReview} />
        <IconButton label={t("Sök · Ctrl+K")} onClick={props.onSearch}>
          <SearchIcon />
        </IconButton>
        <IconButton label={t("Fokusläge · Ctrl+Shift+F")} onClick={props.onFocus}>
          <FocusIcon />
        </IconButton>
      </div>
    </header>
  );
}
