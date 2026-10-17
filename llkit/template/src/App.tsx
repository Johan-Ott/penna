import { Choice, Dialog, Row } from "@llkit/controls.js";
import { useFeedbackDialog } from "@llkit/feedback/FeedbackDialog.js";
import { GuideTip } from "@llkit/guide/GuideTip.js";
import { UI_LANGUAGES } from "@llkit/i18n.js";
import { useMenuButton } from "@llkit/Menu.js";
import { WindowBar, WindowControls } from "@llkit/shell/WindowControls.js";
import { checkForUpdates } from "@llkit/updates.js";
import { useState } from "react";
import { guide } from "./guide.js";
import { t } from "./i18n.js";
import { changeSettings, useSettings, type Theme } from "./settings.js";
import { useTheme } from "./theme.js";

// The app: a first start that asks the language and the look, and then its one screen, with the
// menu, settings, help and feedback llkit gives every app. The app's own work goes in Home.

const themes = (): [Theme, string][] => [
  ["ljust", t("Ljust")],
  ["mörkt", t("Mörkt")],
  ["system", t("System")],
];

function Choices() {
  const settings = useSettings();
  return (
    <>
      <Row label={t("Språk")}>
        <Choice
          label={t("Språk")}
          value={settings.uiLanguage}
          options={UI_LANGUAGES}
          onSelect={(uiLanguage) => changeSettings({ uiLanguage })}
        />
      </Row>
      <Row label={t("Utseende")}>
        <Choice
          label={t("Utseende")}
          value={settings.theme}
          options={themes()}
          onSelect={(theme) => changeSettings({ theme })}
        />
      </Row>
    </>
  );
}

function FirstStart() {
  return (
    <main className="first-start" data-tauri-drag-region>
      <WindowBar />
      <h1>__APP_NAME__</h1>
      <Choices />
      <button className="button primary large" onClick={() => changeSettings({ isStarted: true })}>
        {t("Kom igång")}
      </button>
    </main>
  );
}

function useAppMenu(openSettings: () => void) {
  const feedback = useFeedbackDialog();
  const menu = useMenuButton(t("Meny"), [
    { label: t("Inställningar"), onSelect: openSettings },
    {
      label: t("Hjälp"),
      submenu: [
        { label: t("Visa guiden igen"), onSelect: guide.restart },
        { label: t("Skicka feedback…"), onSelect: feedback.open },
        { label: t("Sök efter uppdateringar…"), onSelect: () => void checkForUpdates(true) },
      ],
    },
  ]);
  const layers = (
    <>
      {menu.menu}
      {feedback.layer}
    </>
  );
  return { open: menu.open, layers };
}

function Home() {
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const menu = useAppMenu(() => setSettingsOpen(true));
  return (
    <div className="home">
      <header className="home-bar" data-tauri-drag-region>
        <button className="button ghost" aria-label={t("Meny")} onClick={menu.open}>
          ☰
        </button>
        <span className="home-title">__APP_NAME__</span>
        <WindowControls />
      </header>
      <main className="home-screen">
        <p>{t("Här börjar appen.")}</p>
      </main>
      <GuideTip guide={guide} step="start" />
      {isSettingsOpen && (
        <Dialog label={t("Inställningar")} onClose={() => setSettingsOpen(false)}>
          <Choices />
        </Dialog>
      )}
      {menu.layers}
    </div>
  );
}

export function App() {
  const settings = useSettings();
  useTheme(settings.theme);
  return settings.isStarted ? <Home /> : <FirstStart />;
}
