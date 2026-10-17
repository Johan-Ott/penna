import { createGuide } from "@llkit/guide/guide.js";
import { t } from "./i18n.js";

// The guide for a new user: one tip for each part of the app, the first time they come there.
export const guide = createGuide(
  [
    {
      id: "start",
      name: t("Start"),
      text: t("Här börjar __APP_NAME__. Menyn uppe till vänster har inställningar och hjälp."),
    },
  ],
  "__APP_SLUG__.guide",
);
