import { useState } from "react";
import {
  HEADING_FONTS,
  START_OWN,
  THEMES,
  bookTheme,
  contrast,
  mix,
  themeFileText,
  themeFrom,
  themeNames,
  type Theme,
} from "../../project/themes.js";
import { Dialog } from "../controls.js";
import { platform } from "../platform.js";
import { t } from "../../i18n/i18n.js";

const THEME_FILE = { name: t("Penna-tema"), extension: "pennatema" };
const SWATCHES: Record<"background" | "text" | "accent", string[]> = {
  background: ["#ffffff", "#f3efe6", "#eef2ec", "#f5ede8", "#1e1f24", "#121212"],
  text: ["#111111", "#2b2520", "#1f2a36", "#3a2226", "#ede8e0", "#c9d1d9"],
  accent: ["#3f6b4e", "#8a5a2b", "#2f5d8a", "#b5546b", "#a83232", "#6b4e9b"],
};

function ThemeChoice(props: {
  id: string;
  theme: Theme | null;
  isOn: boolean;
  onPick: () => void;
}) {
  const [name, description] = themeNames()[props.id] ?? ["", ""];
  const colours = props.theme ?? { background: "#ffffff", text: "#111111", accent: "#3f6b4e" };
  return (
    <button className="theme-choice" aria-pressed={props.isOn} onClick={props.onPick}>
      <span
        className="theme-swatch"
        style={{ background: mix(colours.background, colours.text, 0.12) }}
      >
        <span style={{ background: colours.background }} />
        <span style={{ background: colours.accent }} />
      </span>
      <span className="theme-words">
        <span className="theme-name">{name}</span>
        <span className="insight-muted">{description}</span>
      </span>
    </button>
  );
}

function contrastText(theme: Theme) {
  const ratio = contrast(theme.text, theme.background);
  const shown = ratio.toFixed(1).replace(".", ",");
  if (ratio >= 7) return { text: t("Kontrast {ratio}:1 · bra", { ratio: shown }), isLow: false };
  if (ratio >= 4.5) return { text: t("Kontrast {ratio}:1 · ok", { ratio: shown }), isLow: false };
  return { text: t("För låg kontrast"), isLow: true };
}

function ColourRow(props: {
  label: string;
  field: keyof typeof SWATCHES;
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  const pick = (colour: string) => props.onChange({ ...props.theme, [props.field]: colour });
  return (
    <div className="theme-row">
      <span className="theme-row-label">{props.label}</span>
      {SWATCHES[props.field].map((colour) => (
        <button
          key={colour}
          className="theme-colour"
          aria-label={colour}
          aria-pressed={props.theme[props.field] === colour}
          style={{ background: colour }}
          onClick={() => pick(colour)}
        />
      ))}
      <input
        type="color"
        aria-label={props.label}
        value={props.theme[props.field]}
        onChange={(event) => pick(event.target.value)}
      />
    </div>
  );
}

async function importTheme(onChange: (theme: Theme) => void) {
  const picked = await platform.pickFile({
    name: t("Penna-tema"),
    extensions: ["pennatema", "json"],
  });
  if (!picked) return;
  const theme = themeFrom(JSON.parse(new TextDecoder().decode(picked.bytes)) as unknown);
  if (theme) onChange({ ...theme, id: "eget" });
}

type OwnProps = { theme: Theme; onChange: (theme: Theme) => void };

function FontRow({ theme, onChange }: OwnProps) {
  return (
    <div className="theme-row">
      <span className="theme-row-label">{t("Rubriker")}</span>
      {HEADING_FONTS.map(([label, family]) => (
        <button
          key={label}
          className="theme-font"
          aria-pressed={theme.heading === family}
          style={{ fontFamily: family }}
          onClick={() => onChange({ ...theme, heading: family })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function OwnActions({ theme, onChange }: OwnProps) {
  const save = () =>
    void platform.saveFile(
      `${t("Mitt tema")}.pennatema`,
      new TextEncoder().encode(themeFileText(theme)),
      THEME_FILE,
    );
  return (
    <div className="theme-own-actions">
      <button className="button primary small" onClick={save}>
        {t("Spara som fil")}
      </button>
      <button className="button secondary small" onClick={() => void importTheme(onChange)}>
        {t("Importera")}
      </button>
    </div>
  );
}

function OwnTheme({ theme, onChange }: OwnProps) {
  const level = contrastText(theme);
  return (
    <div className="theme-own">
      <div className="insight-row">
        <span className="insight-title">{t("Eget tema")}</span>
        <span className={level.isLow ? "theme-contrast low" : "theme-contrast"}>{level.text}</span>
      </div>
      <ColourRow label={t("Bakgrund")} field="background" theme={theme} onChange={onChange} />
      <ColourRow label={t("Text")} field="text" theme={theme} onChange={onChange} />
      <ColourRow label={t("Accent")} field="accent" theme={theme} onChange={onChange} />
      <FontRow theme={theme} onChange={onChange} />
      <span className="setting-hint">
        {t("Tre färger räcker. Penna räknar fram resten och varnar om texten blir svårläst.")}
      </span>
      <OwnActions theme={theme} onChange={onChange} />
    </div>
  );
}

function ThemeChoices(props: {
  theme: Theme | null;
  own: Theme | null;
  choose: (theme: Theme | null) => void;
}) {
  const { theme, own, choose } = props;
  return (
    <>
      <ThemeChoice id="app" theme={null} isOn={theme === null} onPick={() => choose(null)} />
      {THEMES.map((each) => (
        <ThemeChoice
          key={each.id}
          id={each.id}
          theme={each}
          isOn={theme?.id === each.id}
          onPick={() => choose(each)}
        />
      ))}
      <ThemeChoice
        id="eget"
        theme={own ?? START_OWN}
        isOn={own !== null}
        onPick={() => choose(own ?? START_OWN)}
      />
    </>
  );
}

/** Tema för boken: the mood while writing, kept in the book; the export follows Publicera. */
export function ThemeDialog(props: {
  fields: Record<string, unknown>;
  onSave: (theme: Theme | null) => void;
  onClose: () => void;
}) {
  const [theme, setTheme] = useState<Theme | null>(() => bookTheme(props.fields));
  const choose = (next: Theme | null) => (setTheme(next), props.onSave(next));
  const own = theme?.id === "eget" ? theme : null;
  return (
    <Dialog label={t("Tema för boken")} className="theme-dialog" onClose={props.onClose}>
      <span className="insight-muted">
        {t("Sätter stämningen när du skriver. Sparas i boken. Exporten styrs bara av Publicera.")}
      </span>
      <ThemeChoices theme={theme} own={own} choose={choose} />
      {own && <OwnTheme theme={own} onChange={choose} />}
      <div className="dialog-actions">
        <button className="button primary" onClick={props.onClose}>
          {t("Klar")}
        </button>
      </div>
    </Dialog>
  );
}
