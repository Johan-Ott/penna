import type { MouseEvent, ReactNode } from "react";
import { MenuIcon } from "../shell/icons.js";
import { WindowBar } from "@llkit/shell/WindowControls.js";
import { t } from "../../i18n/i18n.js";

/** The shelf on a phone: the menu and the profile over the books. */
export const PhoneShelf = (props: {
  onMenu: (event: MouseEvent<HTMLElement>) => void;
  profile: ReactNode;
  children: ReactNode;
}) => (
  <div className="phone-screen">
    <WindowBar />
    <header className="phone-bar">
      <span className="phone-bar-start">
        <button className="topbar-button" aria-label={t("Meny")} onClick={props.onMenu}>
          <MenuIcon />
        </button>
        {props.profile}
      </span>
    </header>
    {props.children}
  </div>
);
