import { useEffect, useState } from "react";
import { platform, type AppUpdate } from "./platform.js";
import type { SceneSession } from "./sceneSession.js";
import { t } from "../i18n/i18n.js";

/** Offline or failing, the check stays quiet. */
function useAppUpdate() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  useEffect(() => {
    void platform
      .checkForUpdate()
      .then(setUpdate)
      .catch(() => undefined);
  }, []);
  return { update, dismiss: () => setUpdate(null) };
}

export function UpdateNotice({ session }: { session: SceneSession }) {
  const { update, dismiss } = useAppUpdate();
  const [isInstalling, setInstalling] = useState(false);
  if (!update) return null;
  const install = async () => {
    setInstalling(true);
    // A scene that cannot be saved stays open; the restart would lose it.
    if (!(await session.autosave.flush())) return setInstalling(false);
    await update.install().catch(() => setInstalling(false));
  };
  return (
    <div className="toast update-notice" role="status">
      <span>{t("Penna {version} finns.", { version: update.version })}</span>
      <button className="link-button" disabled={isInstalling} onClick={() => void install()}>
        {isInstalling ? t("Uppdaterar…") : t("Starta om och uppdatera")}
      </button>
      <button className="link-button quiet" onClick={dismiss}>
        {t("Senare")}
      </button>
    </div>
  );
}
