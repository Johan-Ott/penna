import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

/** Copy and save on a computer; on a phone one Dela, which opens its share sheet. */
export function ImageActions(props: { onCopy: () => void; onSave: () => void }) {
  if (platform.shareFile) {
    return (
      <div className="studio-actions">
        <button className="button primary" onClick={props.onSave}>
          {t("Dela bild")}
        </button>
      </div>
    );
  }
  return (
    <div className="studio-actions">
      <button className="button primary" onClick={props.onCopy}>
        {t("Kopiera bild")}
      </button>
      <button className="button secondary" onClick={props.onSave}>
        {t("Spara bild")}
      </button>
    </div>
  );
}
