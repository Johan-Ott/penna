import { Icon } from "../shell/icons.js";

/** A note put away until Lappar opens again. */
export const HideIcon = () => (
  <Icon size={15}>
    <path d="M6 12h12" />
  </Icon>
);

/** A note thrown away. */
export const TrashIcon = () => (
  <Icon size={15}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M6 7l1 13h10l1-13" />
  </Icon>
);
